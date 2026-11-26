import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service.js'
import { AccessService } from './access.service.js'

type RoleRow = {
  id: string
  name: string
  kind: 'ADMIN' | 'MEMBER' | 'CUSTOM'
  grants: { area: string; action: string }[]
}

const ROLES: RoleRow[] = [
  { id: 'role_admin', name: 'Admin', kind: 'ADMIN', grants: [] },
  { id: 'role_member', name: 'Member', kind: 'MEMBER', grants: [] },
  { id: 'r_cashier', name: 'Cashier', kind: 'CUSTOM', grants: [{ area: 'users', action: 'view' }] },
]

/** In-memory stand-ins for the Prisma calls AccessService makes. */
const PEOPLE: Record<string, { name: string; banned: boolean }> = {
  admin1: { name: 'Ada', banned: false },
  admin2: { name: 'Grace', banned: false },
  cashier1: { name: 'Cy', banned: false },
  u1: { name: 'U', banned: false },
}

function fakePrisma(
  access: Record<string, string>,
  userRoles: Record<string, string>,
  changes: Array<Record<string, unknown>> = [],
) {
  const client = {
    userAccess: {
      findUnique: async ({ where }: { where: { userId: string } }) => {
        const roleId = access[where.userId]
        const role = ROLES.find((r) => r.id === roleId)
        return roleId && role ? { userId: where.userId, roleId, role } : null
      },
      upsert: async ({
        where,
        create,
      }: {
        where: { userId: string }
        create: { roleId: string }
      }) => {
        access[where.userId] = create.roleId
        return { userId: where.userId, roleId: create.roleId }
      },
      count: async ({ where }: { where: { roleId: string; userId: { not: string } } }) =>
        Object.entries(access).filter(
          ([userId, roleId]) =>
            roleId === where.roleId && userId !== where.userId.not && !PEOPLE[userId]?.banned,
        ).length,
    },
    role: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        ROLES.find((r) => r.id === where.id) ?? null,
    },
    accessChange: {
      create: async ({ data }: { data: Record<string, unknown> }) => changes.push(data),
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        PEOPLE[where.id] ? { id: where.id, ...PEOPLE[where.id] } : null,
      update: async ({ where, data }: { where: { id: string }; data: { role: string } }) => {
        userRoles[where.id] = data.role
        return { id: where.id }
      },
    },
  }
  return {
    client: {
      ...client,
      $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) => fn(client),
    },
  }
}

async function make(
  access: Record<string, string> = {},
  userRoles: Record<string, string> = {},
  changes: Array<Record<string, unknown>> = [],
) {
  const module = await Test.createTestingModule({
    providers: [
      AccessService,
      { provide: PrismaService, useValue: fakePrisma(access, userRoles, changes) },
    ],
  }).compile()
  return module.get(AccessService)
}

describe('AccessService.permissionsFor', () => {
  it('treats a person without a role row as Member', async () => {
    const svc = await make()
    const access = await svc.permissionsFor('u1')
    expect(access.role.name).toBe('Member')
    expect(access.permissions.size).toBe(0)
  })

  it('gives Admin every permission', async () => {
    const svc = await make({ u1: 'role_admin' })
    const access = await svc.permissionsFor('u1')
    expect(access.permissions.has('roles:delete')).toBe(true)
    expect(access.permissions.has('users:view')).toBe(true)
  })

  it('gives a custom role exactly its grants', async () => {
    const svc = await make({ u1: 'r_cashier' })
    expect([...(await svc.permissionsFor('u1')).permissions]).toEqual(['users:view'])
  })
})

describe('AccessService.assignRole', () => {
  it("stores the role and derives Better Auth's user.role", async () => {
    const access: Record<string, string> = {}
    const userRoles: Record<string, string> = {}
    const svc = await make(access, userRoles)
    await svc.assignRole('u1', 'role_admin')
    expect(access.u1).toBe('role_admin')
    expect(userRoles.u1).toBe('admin')
    await svc.assignRole('u1', 'r_cashier')
    expect(access.u1).toBe('r_cashier')
    expect(userRoles.u1).toBe('user')
  })

  it('rejects an unknown role', async () => {
    const svc = await make()
    await expect(svc.assignRole('u1', 'nope')).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('AccessService.setUserRole', () => {
  const setup = async (access: Record<string, string>) => {
    const changes: Array<Record<string, unknown>> = []
    const userRoles: Record<string, string> = {}
    return { svc: await make(access, userRoles, changes), access, changes, userRoles }
  }

  it('moves a person, derives user.role and records the change', async () => {
    const t = await setup({ admin1: 'role_admin', u1: 'role_member' })
    await t.svc.setUserRole('admin1', 'u1', 'r_cashier')
    expect(t.access.u1).toBe('r_cashier')
    expect(t.userRoles.u1).toBe('user')
    expect(t.changes).toEqual([
      expect.objectContaining({
        kind: 'USER_ROLE_CHANGED',
        actorId: 'admin1',
        userId: 'u1',
        before: { user: 'U', role: 'Member' },
        after: { user: 'U', role: 'Cashier' },
      }),
    ])
  })

  it('refuses changing your own role', async () => {
    const t = await setup({ admin1: 'role_admin', admin2: 'role_admin' })
    await expect(t.svc.setUserRole('admin1', 'admin1', 'role_member')).rejects.toThrow(
      "You can't change your own role",
    )
  })

  it('only lets Admins move people into or out of Admin', async () => {
    const t = await setup({ admin1: 'role_admin', cashier1: 'r_cashier', u1: 'role_member' })
    await expect(t.svc.setUserRole('cashier1', 'u1', 'role_admin')).rejects.toThrow(
      ForbiddenException,
    )
    await expect(t.svc.setUserRole('cashier1', 'admin1', 'role_member')).rejects.toThrow(
      'Only Admins can move people into or out of Admin',
    )
    await expect(t.svc.setUserRole('admin1', 'u1', 'role_admin')).resolves.toBeDefined()
    expect(t.userRoles.u1).toBe('admin')
  })

  it('keeps at least one active Admin', async () => {
    const t = await setup({ admin1: 'role_admin', admin2: 'role_admin' })
    await t.svc.setUserRole('admin1', 'admin2', 'role_member')
    // admin1 is now the only Admin; nobody else can be left without one either
    await expect(t.svc.assertAdminRemains('admin1')).rejects.toThrow(ConflictException)
    await expect(t.svc.assertAdminRemains('admin1')).rejects.toThrow(
      'At least one active person must stay in Admin',
    )
  })
})

describe('AccessService.forRequest', () => {
  it('reads the caller once per request', async () => {
    const svc = await make({ u1: 'r_cashier' })
    const spy = vi.spyOn(svc, 'permissionsFor')
    const req = {}
    await svc.forRequest(req, 'u1')
    await svc.forRequest(req, 'u1')
    expect(spy).toHaveBeenCalledTimes(1)
    await svc.forRequest({}, 'u1')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
