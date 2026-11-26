import { LogTransport } from './log.transport.js'
import { ResendTransport } from './resend.transport.js'
import type { EmailMessage, EmailTransport } from './email.transport.js'

const message = (): EmailMessage => ({
  to: 'person@example.com',
  subject: 'Hello',
  html: '<p>Hello</p>',
  text: 'Hello',
  idempotencyKey: 'test/1',
})

/** Every transport must behave the same way towards EmailService (Principle III). */
function itSatisfiesTheContract(
  name: string,
  make: (mode: 'ok' | 'fail' | 'throw') => EmailTransport,
) {
  describe(`${name} contract`, () => {
    it('names itself for the boot log', () => {
      expect(make('ok').name).toBe(name)
    })

    it('returns a non-empty id on success and leaves the message untouched', async () => {
      const original = message()
      const copy = { ...original }
      const result = await make('ok').send(original)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.id).not.toBe('')
      expect(original).toEqual(copy)
    })

    it('reports a provider failure instead of throwing', async () => {
      const result = await make('fail').send(message())
      expect(result).toEqual({ ok: false, error: expect.stringMatching(/.+/) })
    })

    it('reports a thrown network error instead of throwing', async () => {
      const result = await make('throw').send(message())
      expect(result.ok).toBe(false)
    })

    it('resolves within the timeout', async () => {
      const started = Date.now()
      await make('ok').send(message())
      expect(Date.now() - started).toBeLessThan(10_000)
    })
  })
}

itSatisfiesTheContract('log', (mode) => {
  const logger = {
    log:
      mode === 'throw'
        ? () => {
            throw new Error('disk full')
          }
        : () => undefined,
    error: () => undefined,
    warn: () => undefined,
  }
  // The log transport only "fails" when its logger throws; "fail" and "throw" coincide.
  return new LogTransport(
    mode === 'ok'
      ? logger
      : {
          ...logger,
          log: () => {
            throw new Error('x')
          },
        },
  )
})

itSatisfiesTheContract('resend', (mode) => {
  const client = {
    emails: {
      send: async () => {
        if (mode === 'throw') throw new TypeError('fetch failed')
        if (mode === 'fail') {
          return { data: null, error: { name: 'validation_error', message: 'Invalid from' } }
        }
        return { data: { id: 'msg_1' }, error: null }
      },
    },
  }
  return new ResendTransport(client, 'Baseline <no-reply@example.com>')
})
