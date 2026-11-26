import { ResendTransport } from './resend.transport.js'

describe('ResendTransport', () => {
  const send = vi.fn()
  const transport = new ResendTransport({ emails: { send } }, 'Baseline <no-reply@example.com>')
  const message = {
    to: 'a@b.dev',
    subject: 'Hi',
    html: '<p>Hi</p>',
    text: 'Hi',
    replyTo: 'help@example.com',
    idempotencyKey: 'invite/1',
  }

  beforeEach(() => send.mockReset())

  it('maps the message onto the SDK call and returns the provider id', async () => {
    send.mockResolvedValue({ data: { id: 'msg_9' }, error: null })
    await expect(transport.send(message)).resolves.toEqual({ ok: true, id: 'msg_9' })
    expect(send).toHaveBeenCalledWith(
      {
        from: 'Baseline <no-reply@example.com>',
        to: ['a@b.dev'],
        subject: 'Hi',
        html: '<p>Hi</p>',
        text: 'Hi',
        replyTo: 'help@example.com',
      },
      { idempotencyKey: 'invite/1' },
    )
  })

  it('maps an SDK error response to a failed send', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'The from address is not verified' },
    })
    await expect(transport.send(message)).resolves.toEqual({
      ok: false,
      error: 'validation_error: The from address is not verified',
    })
  })

  it('maps a thrown network error to a failed send', async () => {
    // A plain function: a vi.fn() that rejects leaves vitest's own tracking promise unhandled.
    const failing = new ResendTransport(
      {
        emails: {
          send: async () => {
            throw new TypeError('fetch failed')
          },
        },
      },
      'Baseline <no-reply@example.com>',
    )
    await expect(failing.send(message)).resolves.toEqual({ ok: false, error: 'fetch failed' })
  })
})
