import { randomUUID } from 'node:crypto'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import { AccessService } from '../access/access.service.js'
import { APP_ENV } from '../../config/env.js'
import { EmailService } from '../../email/email.service.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { InvitesService } from './invites.service.js'

const ROLES = {
  role_admin: { id: 'role_admin', name: 'Admin', kind: 'ADMIN' as const },
  role_member: { id: 'role_member', name: 'Member', kind: 'MEMBER' as const },
  r_cashier: { id: 'r_cashier', name: 'Cashier', kind: 'CUSTOM' as const },
}
type RoleId = keyof typeof ROLES

interface Row {
  id: string
  email: string
  roleId: RoleId
  tokenHash: string
  invitedById: string
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

/** In-memory stand-in for the Prisma calls InvitesService makes; rows come back with their role. */
function fakeDb() {
  const rows = new Map<string, Row>()
  const withRole = (r: Row | undefined) => (r ? { ...r, role: ROLES[r.roleId] } : null)
  const pending = (now: Date) =>
    [...rows.values()].filter((r) => r.acceptedAt === null && r.expiresAt > now)
  const invite = {
    findUnique: async ({ where }: { where: { tokenHash?: string; id?: string } }) =>
      withRole(
        [...rows.values()].find((r) =>
          where.id ? r.id === where.id : r.tokenHash === where.tokenHash,
        ),
      ),
    findMany: async ({
      where,
      skip = 0,
      take,
    }: {
      where: { email?: string; expiresAt?: { gt: Date } }
      skip?: number
      take?: number
    }) => {
      const list = where.expiresAt
        ? pending(where.expiresAt.gt)
        : [...rows.values()].filter((r) => r.email === where.email && r.acceptedAt === null)
      return list.slice(skip, take ? skip + take : undefined).map(withRole)
    },
    count: async ({ where }: { where: { expiresAt: { gt: Date } } }) =>
      pending(where.expiresAt.gt).length,
    create: async ({ data }: { data: Omit<Row, 'id' | 'acceptedAt'> }) => {
      const row: Row = { ...data, id: randomUUID(), acceptedAt: null }
      rows.set(row.id, row)
      return withRole(row)
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) =>
      withRole(Object.assign(rows.get(where.id)!, data)),
    delete: async ({ where }: { where: { id: string } }) => {
      const row = rows.get(where.id)
      rows.delete(where.id)
      return row
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { email: string; expiresAt: { gt: Date } }
      data: Partial<Row>
    }) => {
      for (const r of rows.values()) {
        if (r.email === where.email && r.acceptedAt === null && r.expiresAt > where.expiresAt.gt) {
          Object.assign(r, data)
        }
      }
    },
  }
  const role = {
    findUnique: async ({ where }: { where: { id: string } }) => ROLES[where.id as RoleId] ?? null,
  }
  const client = { invite, role }
  return {
    rows,
    client: {
      ...client,
      $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) => fn(client),
    },
  }
}

describe('InvitesService', () => {
  let service: InvitesService
  let db: ReturnType<typeof fakeDb>
  const access = {
    assignRole: vi.fn(),
    permissionsFor: vi.fn(),
  }
  const email = { sendInvite: vi.fn() }
  const asActor = (kind: 'ADMIN' | 'CUSTOM') =>
    access.permissionsFor.mockResolvedValue({
      role: { id: 'x', name: 'x', kind },
      permissions: new Set(),
    })

  beforeEach(async () => {
    vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') })
    vi.clearAllMocks()
    asActor('ADMIN')
    email.sendInvite.mockResolvedValue(true)
    db = fakeDb()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: PrismaService, useValue: { client: db.client } },
        { provide: AccessService, useValue: access },
        { provide: EmailService, useValue: email },
        { provide: APP_ENV, useValue: { webOrigins: ['https://app.example.com'] } },
      ],
    }).compile()
    service = module.get(InvitesService)
  })

  afterEach(() => vi.useRealTimers())

  it('issues an invite into a role that validates and then accepts once', async () => {
    const { token, invite } = await service.inviteUser({
      email: 'New@Test.dev',
      roleId: 'r_cashier',
      invitedById: 'admin-1',
    })
    expect(invite.email).toBe('new@test.dev')
    expect(invite.accessRole).toEqual(ROLES.r_cashier)
    expect(await service.validateToken(token)).toMatchObject({
      valid: true,
      email: 'new@test.dev',
      roleName: 'Cashier',
    })
    expect(await service.hasPendingInvite('NEW@test.dev')).toBe(true)

    await expect(service.accept(token, { userId: 'u-2', email: 'other@test.dev' })).rejects.toThrow(
      /different email/,
    )
    expect(await service.accept(token, { userId: 'u-2', email: 'NEW@test.dev' })).toMatchObject({
      roleName: 'Cashier',
    })
    expect(access.assignRole).toHaveBeenCalledWith('u-2', 'r_cashier', expect.anything())
    await expect(service.accept(token, { userId: 'u-2', email: 'new@test.dev' })).rejects.toThrow(
      /already used/,
    )
  })

  it('emails the invitation link with the role name and expiry', async () => {
    const result = await service.inviteUser({
      email: 'New@Test.dev',
      roleId: 'r_cashier',
      invitedById: 'admin-1',
    })
    expect(result.inviteUrl).toBe(
      `https://app.example.com/invite?token=${result.token}&email=new%40test.dev`,
    )
    expect(email.sendInvite).toHaveBeenCalledWith({
      to: 'new@test.dev',
      inviteId: result.invite.id,
      inviteUrl: result.inviteUrl,
      roleName: 'Cashier',
      expiresAt: result.invite.expiresAt,
    })
    expect(result.emailSent).toBe(true)
  })

  it('still issues the invite when the email cannot be sent', async () => {
    email.sendInvite.mockResolvedValue(false)
    const result = await service.inviteUser({ email: 'a@b.dev', invitedById: 'admin-1' })
    expect(result.emailSent).toBe(false)
    expect((await service.validateToken(result.token)).valid).toBe(true)
  })

  it('uses Member when no role is chosen', async () => {
    const { invite } = await service.inviteUser({ email: 'a@test.dev', invitedById: 'x' })
    expect(invite.accessRole.id).toBe('role_member')
  })

  it('maps the deprecated admin/user role to the built-in roles', async () => {
    const { invite } = await service.inviteUser({
      email: 'a@test.dev',
      legacyRole: 'admin',
      invitedById: 'x',
    })
    expect(invite.accessRole.id).toBe('role_admin')
  })

  it('only lets Admins invite someone into Admin', async () => {
    asActor('CUSTOM')
    await expect(
      service.inviteUser({ email: 'a@test.dev', roleId: 'role_admin', invitedById: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    await expect(
      service.inviteUser({ email: 'a@test.dev', roleId: 'r_cashier', invitedById: 'x' }),
    ).resolves.toBeDefined()
  })

  it('rejects an unknown role and an invalid email', async () => {
    await expect(
      service.inviteUser({ email: 'a@test.dev', roleId: 'nope', invitedById: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException)
    await expect(service.inviteUser({ email: 'bad', invitedById: 'x' })).rejects.toThrow(
      /Invalid email/,
    )
  })

  it('a new invite supersedes the pending one for the same email', async () => {
    const first = await service.inviteUser({ email: 'a@test.dev', invitedById: 'x' })
    const second = await service.inviteUser({ email: 'a@test.dev', invitedById: 'x' })
    expect((await service.validateToken(first.token)).valid).toBe(false)
    expect((await service.validateToken(second.token)).valid).toBe(true)
  })

  it('lists pending invites and revokes one', async () => {
    const a = await service.inviteUser({ email: 'a@test.dev', invitedById: 'x' })
    await service.inviteUser({ email: 'b@test.dev', invitedById: 'x' })
    const page = await service.pendingInvites({ page: 1, perPage: 10 })
    expect(page.meta.total).toBe(2)
    expect(await service.revokeInvite(a.invite.id)).toBe(true)
    expect((await service.pendingInvites({})).meta.total).toBe(1)
    expect((await service.validateToken(a.token)).valid).toBe(false)
    await expect(service.revokeInvite(a.invite.id)).rejects.toBeInstanceOf(NotFoundException)
  })
})
