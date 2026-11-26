import { Test, type TestingModule } from '@nestjs/testing'
import { AccessService } from '../access/access.service.js'
import { AuthPasswords } from '../../auth/auth-passwords.js'
import { PasswordResetService } from '../password-reset/password-reset.service.js'
import { UsersResolver } from './users.resolver.js'
import { UsersService } from './users.service.js'

describe('UsersResolver', () => {
  let resolver: UsersResolver
  const access = { forRequest: vi.fn() }
  const passwords = { hasPassword: vi.fn() }
  const resets = { pendingExpiryFor: vi.fn() }
  const usersService = {
    findAll: vi.fn(),
    findById: vi.fn(),
    updateUser: vi.fn(),
    deactivateUser: vi.fn(),
    reactivateUser: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        { provide: UsersService, useValue: usersService },
        { provide: AccessService, useValue: access },
        { provide: AuthPasswords, useValue: passwords },
        { provide: PasswordResetService, useValue: resets },
      ],
    }).compile()
    resolver = module.get(UsersResolver)
  })

  it('passes paging arguments to the service', async () => {
    await resolver.findAllUsers({ page: 2, perPage: 25 })
    expect(usersService.findAll).toHaveBeenCalledWith({ page: 2, perPage: 25 })
  })

  it('loads the signed-in person from the database', async () => {
    usersService.findById.mockResolvedValue({ id: 'u1' })
    expect(await resolver.me({ user: { id: 'u1' } } as never)).toEqual({ id: 'u1' })
  })

  it('manages people on behalf of the caller', async () => {
    const session = { user: { id: 'actor' } } as never
    await resolver.updateUser({ id: 'u2', name: 'Bo' })
    expect(usersService.updateUser).toHaveBeenCalledWith({ id: 'u2', name: 'Bo' })
    await resolver.deactivateUser('u2', session)
    expect(usersService.deactivateUser).toHaveBeenCalledWith('actor', 'u2')
    await resolver.reactivateUser('u2', session)
    expect(usersService.reactivateUser).toHaveBeenCalledWith('actor', 'u2')
  })

  it('tells the caller what they may do with each person', async () => {
    access.forRequest.mockResolvedValue({
      role: { kind: 'CUSTOM' },
      permissions: new Set(['users:delete']),
    })
    const target = { id: 'u2', accessRole: { kind: 'MEMBER' }, deactivated: false }
    const req = { session: { user: { id: 'u1' } } }
    expect(await resolver.can(target as never, req)).toEqual({
      edit: false,
      changeRole: false,
      deactivate: true,
      reactivate: false,
      resetPassword: false,
      changePassword: false,
    })
    expect(passwords.hasPassword).not.toHaveBeenCalled()
  })

  it('offers a password change only on your own record, when you have a password', async () => {
    access.forRequest.mockResolvedValue({ role: { kind: 'MEMBER' }, permissions: new Set() })
    const self = { id: 'u1', accessRole: { kind: 'MEMBER' }, deactivated: false }
    const req = { session: { user: { id: 'u1' } } }
    passwords.hasPassword.mockResolvedValue(true)
    expect((await resolver.can(self as never, req)).changePassword).toBe(true)
    passwords.hasPassword.mockResolvedValue(false)
    expect((await resolver.can(self as never, req)).changePassword).toBe(false)
    expect(passwords.hasPassword).toHaveBeenCalledWith('u1')
  })

  it('shows pending reset links to Admins only, loading them once per request', async () => {
    const expiresAt = new Date('2026-01-02T00:00:00Z')
    resets.pendingExpiryFor.mockResolvedValue(new Map([['u2', expiresAt]]))
    access.forRequest.mockResolvedValue({ role: { kind: 'ADMIN' }, permissions: new Set() })
    const req = { session: { user: { id: 'u1' } } }
    expect(await resolver.passwordResetExpiresAt({ id: 'u2' } as never, req)).toEqual(expiresAt)
    expect(await resolver.passwordResetExpiresAt({ id: 'u3' } as never, req)).toBeNull()
    expect(resets.pendingExpiryFor).toHaveBeenCalledTimes(1)

    access.forRequest.mockResolvedValue({ role: { kind: 'CUSTOM' }, permissions: new Set() })
    const other = { session: { user: { id: 'u4' } } }
    expect(await resolver.passwordResetExpiresAt({ id: 'u2' } as never, other)).toBeNull()
    expect(resets.pendingExpiryFor).toHaveBeenCalledTimes(1)
  })
})
