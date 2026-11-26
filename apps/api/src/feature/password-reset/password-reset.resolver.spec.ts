import { Test } from '@nestjs/testing'
import { APP_ENV } from '../../config/env.js'
import { PasswordResetResolver } from './password-reset.resolver.js'
import { PasswordResetService } from './password-reset.service.js'
import { PasswordService } from './password.service.js'

describe('PasswordResetResolver', () => {
  const service = { create: vi.fn(), validate: vi.fn(), reset: vi.fn(), cancel: vi.fn() }
  const own = { change: vi.fn() }
  let resolver: PasswordResetResolver
  const session = { user: { id: 'admin' }, session: { token: 'tok' } } as never

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        PasswordResetResolver,
        { provide: PasswordResetService, useValue: service },
        { provide: PasswordService, useValue: own },
        { provide: APP_ENV, useValue: { webOrigins: ['https://app.example.com'] } },
      ],
    }).compile()
    resolver = module.get(PasswordResetResolver)
  })

  it('publishes the password rules', () => {
    expect(resolver.passwordPolicy()).toEqual({ minLength: 8, maxLength: 128 })
  })

  it('creates a link as the signed-in caller and returns the web URL once', async () => {
    const expiresAt = new Date('2026-01-02T00:00:00Z')
    service.create.mockResolvedValue({
      token: 'abc_-1',
      url: 'https://app.example.com/reset-password?token=abc_-1',
      expiresAt,
      emailSent: false,
    })
    const link = await resolver.createPasswordResetLink('bo', session)
    expect(service.create).toHaveBeenCalledWith('admin', 'bo')
    expect(link).toEqual({
      url: 'https://app.example.com/reset-password?token=abc_-1',
      expiresAt,
      emailSent: false,
    })
  })

  it('passes token checks and resets straight to the service', async () => {
    service.validate.mockResolvedValue({ valid: false, name: null, expiresAt: null })
    expect((await resolver.validatePasswordResetToken('t')).valid).toBe(false)
    service.reset.mockResolvedValue(true)
    expect(await resolver.resetPassword({ token: 't', newPassword: 'a-new-password' })).toBe(true)
    expect(service.reset).toHaveBeenCalledWith('t', 'a-new-password')
  })

  it('cancels a link as the signed-in caller', async () => {
    service.cancel.mockResolvedValue(true)
    expect(await resolver.cancelPasswordResetLink('bo', session)).toBe(true)
    expect(service.cancel).toHaveBeenCalledWith('admin', 'bo')
  })

  it('changes your own password, keeping the session in use', async () => {
    own.change.mockResolvedValue(true)
    const input = { currentPassword: 'old-password', newPassword: 'new-password' }
    expect(await resolver.changePassword(input, session)).toBe(true)
    expect(own.change).toHaveBeenCalledWith('admin', 'tok', 'old-password', 'new-password')
  })
})
