import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AuthPasswords } from '../../auth/auth-passwords.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { PasswordService } from './password.service.js'

describe('PasswordService.change', () => {
  let svc: PasswordService
  const changes: Array<Record<string, unknown>> = []
  const passwords = {
    hasPassword: vi.fn(),
    verify: vi.fn(),
    setPassword: vi.fn(),
    signOutOthers: vi.fn(),
  }
  const client = {
    user: { findUnique: async () => ({ id: 'u1', name: 'Ada' }) },
    accessChange: {
      create: async ({ data }: { data: Record<string, unknown> }) => changes.push(data),
    },
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    changes.length = 0
    passwords.hasPassword.mockResolvedValue(true)
    passwords.verify.mockResolvedValue(true)
    const module = await Test.createTestingModule({
      providers: [
        PasswordService,
        { provide: AuthPasswords, useValue: passwords },
        {
          provide: PrismaService,
          useValue: {
            client: { ...client, $transaction: async (fn: (tx: unknown) => unknown) => fn(client) },
          },
        },
      ],
    }).compile()
    svc = module.get(PasswordService)
  })

  it('changes the password, keeps this session, signs out the others and records it', async () => {
    expect(await svc.change('u1', 'this-session', 'old-password', 'new-password')).toBe(true)
    expect(passwords.verify).toHaveBeenCalledWith('u1', 'old-password')
    expect(passwords.setPassword).toHaveBeenCalledWith('u1', 'new-password')
    expect(passwords.signOutOthers).toHaveBeenCalledWith('u1', 'this-session')
    expect(changes).toEqual([
      expect.objectContaining({
        kind: 'PASSWORD_CHANGED',
        actorId: 'u1',
        userId: 'u1',
        after: { user: 'Ada' },
      }),
    ])
  })

  it('refuses a wrong current password and changes nothing', async () => {
    passwords.verify.mockResolvedValue(false)
    await expect(svc.change('u1', 's', 'wrong', 'new-password')).rejects.toThrow(
      BadRequestException,
    )
    await expect(svc.change('u1', 's', 'wrong', 'new-password')).rejects.toThrow(
      'Your current password is incorrect.',
    )
    expect(passwords.setPassword).not.toHaveBeenCalled()
    expect(passwords.signOutOthers).not.toHaveBeenCalled()
  })

  it('refuses someone who has no password', async () => {
    passwords.hasPassword.mockResolvedValue(false)
    await expect(svc.change('u1', 's', 'x', 'new-password')).rejects.toThrow(
      'You sign in with Google and have no password to change',
    )
  })

  it('refuses a new password that breaks the rules', async () => {
    await expect(svc.change('u1', 's', 'old-password', 'short')).rejects.toThrow(
      'Password must be 8–128 characters',
    )
    expect(passwords.setPassword).not.toHaveBeenCalled()
  })
})
