import { ConflictException, ForbiddenException } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import { AccessService } from '../access/access.service.js'
import { AuthPasswords } from '../../auth/auth-passwords.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { UsersService } from './users.service.js'

const MEMBER = { id: 'role_member', name: 'Member', kind: 'MEMBER' as const }
const CASHIER = { id: 'r_cashier', name: 'Cashier', kind: 'CUSTOM' as const }

function row(over: Record<string, unknown> = {}) {
  return {
    id: '1',
    name: 'A',
    email: 'a@x.dev',
    username: null,
    role: 'user',
    image: null,
    banned: false,
    createdAt: new Date(),
    access: null,
    ...over,
  }
}

describe('UsersService', () => {
  let service: UsersService
  const user = {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  }
  const role = { findUnique: vi.fn() }
  const session = { deleteMany: vi.fn() }
  const passwordResetLink = { updateMany: vi.fn() }
  const passwords = { signOutEverywhere: vi.fn() }
  const accessChange = { create: vi.fn() }
  const access = { permissionsFor: vi.fn(), assertAdminRemains: vi.fn() }
  const actorIs = (kind: string) =>
    access.permissionsFor.mockImplementation(async (id: string) => ({
      role: { id, name: kind, kind: id === 'actor' ? kind : 'CUSTOM' },
      permissions: new Set(),
    }))

  beforeEach(async () => {
    vi.clearAllMocks()
    user.findMany.mockResolvedValue([])
    user.count.mockResolvedValue(0)
    role.findUnique.mockResolvedValue(MEMBER)
    user.findUnique.mockResolvedValue(row({ id: 'u2', name: 'Bo' }))
    user.findFirst.mockResolvedValue(null)
    actorIs('CUSTOM')
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: AccessService, useValue: access },
        { provide: AuthPasswords, useValue: passwords },
        {
          provide: PrismaService,
          useValue: {
            client: {
              user,
              role,
              $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
                fn({ user, session, accessChange, passwordResetLink }),
            },
          },
        },
      ],
    }).compile()
    service = module.get(UsersService)
  })

  it('pages newest first and returns meta', async () => {
    user.count.mockResolvedValue(45)
    const result = await service.findAll({ page: 3, perPage: 20 })
    expect(user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' }, skip: 40, take: 20 }),
    )
    expect(result.meta).toMatchObject({ total: 45, currentPage: 3, lastPage: 3 })
  })

  it('defaults to the first page of 10', async () => {
    await service.findAll()
    expect(user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }))
  })

  it("shows each person's role, Member when they have none, and the derived legacy role", async () => {
    user.findMany.mockResolvedValueOnce([
      row({ id: '1', access: { role: CASHIER } }),
      row({ id: '2', banned: true }),
    ])
    const { data } = await service.findAll()
    expect(data[0]).toMatchObject({ accessRole: CASHIER, role: 'user', deactivated: false })
    expect(data[1]).toMatchObject({ accessRole: MEMBER, deactivated: true })
  })

  it('finds one person by id', async () => {
    user.findUnique.mockResolvedValueOnce(row({ access: { role: { ...CASHIER } } }))
    expect((await service.findById('1'))?.accessRole.name).toBe('Cashier')
    user.findUnique.mockResolvedValueOnce(null)
    expect(await service.findById('nope')).toBeNull()
  })

  describe('updateUser', () => {
    it('changes name and username only', async () => {
      await service.updateUser({ id: 'u2', name: ' Bo B ', username: 'BoB' })
      expect(user.update).toHaveBeenCalledWith({
        where: { id: 'u2' },
        data: { name: 'Bo B', username: 'bob', displayUsername: 'BoB' },
      })
    })

    it('rejects a taken username', async () => {
      user.findFirst.mockResolvedValueOnce({ id: 'other' })
      await expect(service.updateUser({ id: 'u2', username: 'taken' })).rejects.toThrow(
        'This username is taken',
      )
    })
  })

  describe('deactivateUser', () => {
    it('blocks sign-in, signs the person out and records it', async () => {
      await service.deactivateUser('actor', 'u2')
      expect(user.update).toHaveBeenCalledWith({
        where: { id: 'u2' },
        data: { banned: true, banReason: 'deactivated', banExpires: null },
      })
      // Signed out through Better Auth (FR-016), not by deleting rows directly
      expect(passwords.signOutEverywhere).toHaveBeenCalledWith('u2')
      expect(session.deleteMany).not.toHaveBeenCalled()
      // A pending reset link stops working (FR-009)
      expect(passwordResetLink.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u2', usedAt: null, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      })
      expect(accessChange.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ kind: 'USER_DEACTIVATED', userId: 'u2', actorId: 'actor' }),
      })
    })

    it('refuses yourself', async () => {
      await expect(service.deactivateUser('u2', 'u2')).rejects.toThrow(
        "You can't deactivate yourself",
      )
    })

    it('keeps an active Admin and lets only Admins deactivate an Admin', async () => {
      access.permissionsFor.mockImplementation(async (id: string) => ({
        role: { kind: id === 'u2' ? 'ADMIN' : 'CUSTOM' },
        permissions: new Set(),
      }))
      await expect(service.deactivateUser('actor', 'u2')).rejects.toThrow(ForbiddenException)
      access.permissionsFor.mockImplementation(async () => ({
        role: { kind: 'ADMIN' },
        permissions: new Set(),
      }))
      access.assertAdminRemains.mockRejectedValueOnce(new ConflictException('last'))
      await expect(service.deactivateUser('actor', 'u2')).rejects.toThrow(ConflictException)
    })
  })

  describe('reactivateUser', () => {
    it('is for Admins only', async () => {
      await expect(service.reactivateUser('actor', 'u2')).rejects.toThrow(
        'Only Admins can reactivate people',
      )
      actorIs('ADMIN')
      await service.reactivateUser('actor', 'u2')
      expect(user.update).toHaveBeenCalledWith({
        where: { id: 'u2' },
        data: { banned: false, banReason: null, banExpires: null },
      })
      expect(accessChange.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ kind: 'USER_REACTIVATED' }),
      })
    })
  })
})
