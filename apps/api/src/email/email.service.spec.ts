import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { APP_ENV } from '../config/env.js'
import { EmailService } from './email.service.js'
import { EMAIL_TRANSPORT, type EmailMessage, type EmailSendResult } from './email.transport.js'

describe('EmailService', () => {
  const sent: EmailMessage[] = []
  let outcome: EmailSendResult | Error = { ok: true, id: 'msg_1' }
  const transport = {
    name: 'fake',
    send: async (message: EmailMessage) => {
      sent.push(message)
      if (outcome instanceof Error) throw outcome
      return outcome
    },
  }
  let service: EmailService
  const expiresAt = new Date('2026-12-03T10:00:00Z')

  beforeEach(async () => {
    sent.length = 0
    outcome = { ok: true, id: 'msg_1' }
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: EMAIL_TRANSPORT, useValue: transport },
        {
          provide: APP_ENV,
          useValue: {
            email: { from: 'Baseline <no-reply@example.com>', replyTo: 'help@example.com' },
          },
        },
      ],
    }).compile()
    service = module.get(EmailService)
    vi.spyOn(Logger, 'log').mockImplementation(() => undefined)
    vi.spyOn(Logger, 'error').mockImplementation(() => undefined)
  })

  it('renders the invite and hands it to the transport with an idempotency key', async () => {
    const ok = await service.sendInvite({
      to: 'a@b.dev',
      inviteId: 'inv_1',
      inviteUrl: 'https://app.example.com/invite?token=t',
      roleName: 'Cashier',
      expiresAt,
    })
    expect(ok).toBe(true)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      to: 'a@b.dev',
      replyTo: 'help@example.com',
      idempotencyKey: 'invite/inv_1',
    })
    expect(sent[0].subject).toContain('Cashier')
    expect(sent[0].html).toContain('https://app.example.com/invite?token=t')
  })

  it('renders the password reset for the account email', async () => {
    const ok = await service.sendPasswordReset({
      to: 'bo@b.dev',
      userId: 'u_bo',
      name: 'Bo',
      resetUrl: 'https://app.example.com/reset-password?token=t',
      expiresAt,
    })
    expect(ok).toBe(true)
    expect(sent[0]).toMatchObject({
      to: 'bo@b.dev',
      idempotencyKey: `password-reset/u_bo/${expiresAt.getTime()}`,
    })
    expect(sent[0].text).toContain('https://app.example.com/reset-password?token=t')
  })

  it('returns false and logs when the transport reports a failure', async () => {
    outcome = { ok: false, error: 'Invalid from' }
    const ok = await service.sendInvite({
      to: 'a@b.dev',
      inviteId: 'inv_1',
      inviteUrl: 'https://x',
      roleName: 'Member',
      expiresAt,
    })
    expect(ok).toBe(false)
    expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid from'), 'Email')
  })

  it('returns false and logs when the transport throws, never propagating', async () => {
    outcome = new Error('boom')
    await expect(
      service.sendInvite({
        to: 'a@b.dev',
        inviteId: 'inv_1',
        inviteUrl: 'https://x',
        roleName: 'Member',
        expiresAt,
      }),
    ).resolves.toBe(false)
    expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'), 'Email')
  })
})
