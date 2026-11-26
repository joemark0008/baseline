import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service.js'
import { RolesService } from './roles.service.js'

interface RoleRow {
  id: string
  name: string
  nameKey: string
  description: string | null
  kind: 'ADMIN' | 'MEMBER' | 'CUSTOM'
  createdAt: Date
}
type GrantRow = { roleId: string; area: string; action: string }

/** In-memory stand-ins for the Prisma calls RolesService makes. */
function fakeDb() {
  let seq = 0
  const roles = new Map<string, RoleRow>()
  let grants: GrantRow[] = []
  const members: Record<string, number> = {}
  const pendingInvites: Record<string, number> = {}
  const spentInvites: Record<string, number> = {}
  const changes: Array<Record<string, unknown>> = []
  const add = (r: Omit<RoleRow, 'createdAt'>) =>
    roles.set(r.id, { ...r, createdAt: new Date(2026, 0, ++seq) })
  add({ id: 'role_admin', name: 'Admin', nameKey: 'admin', description: null, kind: 'ADMIN' })
  add({ id: 'role_member', name: 'Member', nameKey: 'member', description: null, kind: 'MEMBER' })
  const withGrants = (r: RoleRow | undefined) =>
    r ? { ...r, grants: grants.filter((g) => g.roleId === r.id) } : null

  const client = {
    role: {
      findMany: async () => [...roles.values()].map(withGrants),
      findUnique: async ({ where }: { where: { id?: string; nameKey?: string } }) =>
        withGrants(
          [...roles.values()].find((r) =>
            where.id ? r.id === where.id : r.nameKey === where.nameKey,
          ),
        ),
      create: async ({ data }: { data: Omit<RoleRow, 'id' | 'createdAt' | 'kind'> }) => {
        const id = `r${++seq}`
        add({ ...data, id, kind: 'CUSTOM' })
        return withGrants(roles.get(id))
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<RoleRow> }) =>
        withGrants(Object.assign(roles.get(where.id)!, data)),
      delete: async ({ where }: { where: { id: string } }) => roles.delete(where.id),
    },
    roleGrant: {
      deleteMany: async ({ where }: { where: { roleId: string } }) => {
        grants = grants.filter((g) => g.roleId !== where.roleId)
      },
      createMany: async ({ data }: { data: GrantRow[] }) => {
        grants.push(...data)
      },
    },
    userAccess: {
      count: async ({ where }: { where: { roleId: string } }) => members[where.roleId] ?? 0,
    },
    user: { count: async () => 0 },
    invite: {
      count: async ({ where }: { where: { roleId: string } }) => pendingInvites[where.roleId] ?? 0,
      deleteMany: async ({ where }: { where: { roleId: string } }) => {
        spentInvites[where.roleId] = 0
      },
    },
    accessChange: {
      create: async ({ data }: { data: Record<string, unknown> }) => changes.push(data),
      findMany: async () =>
        [...changes]
          .reverse()
          .map((c, i) => ({ id: `c${i}`, createdAt: new Date(), actor: null, ...c })),
      count: async () => changes.length,
    },
  }
  return {
    client: {
      ...client,
      $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) => fn(client),
    },
    members,
    pendingInvites,
    changes,
  }
}

describe('RolesService', () => {
  let db: ReturnType<typeof fakeDb>
  let svc: RolesService

  beforeEach(async () => {
    db = fakeDb()
    const module = await Test.createTestingModule({
      providers: [RolesService, { provide: PrismaService, useValue: { client: db.client } }],
    }).compile()
    svc = module.get(RolesService)
  })

  const create = (name: string, grants: { area: string; action: string }[] = []) =>
    svc.create({ name, description: null, grants }, 'actor')

  it('creates a role with a trimmed name and implied View, and records it', async () => {
    const role = await create('  Cashier ', [{ area: 'invites', action: 'add' }])
    expect(role.name).toBe('Cashier')
    expect(role.grants).toEqual([
      { area: 'invites', action: 'view' },
      { area: 'invites', action: 'add' },
    ])
    expect(db.changes).toEqual([
      expect.objectContaining({ kind: 'ROLE_CREATED', roleId: role.id, actorId: 'actor' }),
    ])
  })

  it('refuses a duplicate name regardless of case', async () => {
    await create('Support')
    await expect(create('support')).rejects.toThrow(ConflictException)
    await expect(create('SUPPORT')).rejects.toThrow(/A role with this name exists/)
  })

  it('refuses an unknown permission', async () => {
    await expect(create('X', [{ area: 'nope', action: 'view' }])).rejects.toThrow(
      BadRequestException,
    )
  })

  it('updates name, description and grants, and records the before and after', async () => {
    const role = await create('Cashier', [{ area: 'users', action: 'view' }])
    const updated = await svc.update(
      { id: role.id, name: 'Till', grants: [{ area: 'users', action: 'edit' }] },
      'actor',
    )
    expect(updated.name).toBe('Till')
    expect(updated.grants.map((g) => `${g.area}:${g.action}`)).toEqual(['users:view', 'users:edit'])
    const change = db.changes.at(-1)!
    expect(change).toMatchObject({ kind: 'ROLE_UPDATED', before: { name: 'Cashier' } })
    expect(change.after).toMatchObject({ name: 'Till', grants: ['users:view', 'users:edit'] })
  })

  it('protects built-in roles', async () => {
    await expect(svc.update({ id: 'role_member', name: 'Staff' }, 'a')).rejects.toThrow(
      /Built-in roles can't be/,
    )
    await expect(
      svc.update({ id: 'role_admin', grants: [{ area: 'users', action: 'view' }] }, 'a'),
    ).rejects.toThrow(/Built-in roles can't be/)
    await expect(svc.delete('role_member', 'a')).rejects.toThrow(BadRequestException)
    const member = await svc.update(
      { id: 'role_member', grants: [{ area: 'users', action: 'view' }] },
      'a',
    )
    expect(member.grants).toEqual([{ area: 'users', action: 'view' }])
  })

  it('gives Admin every permission in the catalogue', async () => {
    const admin = await svc.get('role_admin')
    expect(admin.grants).toContainEqual({ area: 'roles', action: 'delete' })
  })

  it('refuses to delete a role in use, with counts', async () => {
    const role = await create('Cashier')
    db.members[role.id] = 2
    db.pendingInvites[role.id] = 1
    await expect(svc.delete(role.id, 'a')).rejects.toThrow(
      'This role is used by 2 people and 1 invites',
    )
    db.members[role.id] = 0
    db.pendingInvites[role.id] = 0
    expect(await svc.delete(role.id, 'a')).toBe(true)
    expect(db.changes.at(-1)).toMatchObject({ kind: 'ROLE_DELETED', before: { name: 'Cashier' } })
    await expect(svc.get(role.id)).rejects.toThrow(NotFoundException)
  })

  it('lists built-ins first, then custom roles by name, with counts', async () => {
    await create('Zeta')
    const alpha = await create('Alpha')
    db.members[alpha.id] = 3
    const list = await svc.list()
    expect(list.map((r) => r.name)).toEqual(['Admin', 'Member', 'Alpha', 'Zeta'])
    expect(list[2].memberCount).toBe(3)
  })

  it('lists the history newest first with a summary', async () => {
    await create('Cashier')
    await create('Support')
    const page = await svc.accessChanges({})
    expect(page.meta.total).toBe(2)
    expect(page.data[0].summary).toBe('Created role "Support" with no permissions')
  })
})
