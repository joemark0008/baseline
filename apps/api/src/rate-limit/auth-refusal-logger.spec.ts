import { EventEmitter } from 'node:events'
import type { Logger } from '@nestjs/common'
import { DEFAULT_CLIENT_IP_HEADERS, DEFAULT_RATE_LIMITS, type AppEnv } from '../config/env.js'
import { authRefusalLogger, type AuthRequest, type AuthResponse } from './auth-refusal-logger.js'

const env = { rateLimit: DEFAULT_RATE_LIMITS, clientIpHeaders: DEFAULT_CLIENT_IP_HEADERS } as AppEnv

function run(req: Partial<AuthRequest>, statusCode: number): string[] {
  const warn = vi.fn()
  const res = Object.assign(new EventEmitter(), { statusCode }) as AuthResponse & EventEmitter
  const next = vi.fn()
  authRefusalLogger(env, { warn } as unknown as Logger)({ headers: {}, ...req }, res, next)
  expect(next).toHaveBeenCalledOnce()
  res.emit('finish')
  return warn.mock.calls.map((c) => String(c[0]))
}

describe('authRefusalLogger', () => {
  it('logs a sign-in refusal with the sign-in rule and the caller address', () => {
    const lines = run(
      {
        originalUrl: '/api/auth/sign-in/email?x=1',
        headers: { 'cf-connecting-ip': '203.0.113.9' },
        ip: '10.0.0.1',
      },
      429,
    )
    expect(lines).toEqual([
      'Rate limit hit: group=sign-in caller=ip:203.0.113.9 limit=5/60s path=/sign-in/email',
    ])
  })

  it('attributes other auth routes to the general rule', () => {
    expect(run({ originalUrl: '/api/auth/get-session', ip: '::ffff:10.0.0.1' }, 429)).toEqual([
      'Rate limit hit: group=general caller=ip:10.0.0.1 limit=300/60s path=/get-session',
    ])
    expect(
      run({ url: '/api/auth/sign-up/email', socket: { remoteAddress: '10.0.0.2' } }, 429)[0],
    ).toContain('group=sign-in caller=ip:10.0.0.2')
  })

  it('stays silent on any other status', () => {
    expect(run({ originalUrl: '/api/auth/sign-in/email' }, 200)).toEqual([])
    expect(run({ originalUrl: '/api/auth/sign-in/email' }, 401)).toEqual([])
  })
})
