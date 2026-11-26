import type { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { ThrottlerOptions } from '@nestjs/throttler'
import { DEFAULT_RATE_LIMITS, type AppEnv } from '../config/env.js'
import { OneTimeLinkOperation } from './rate-limit.decorators.js'
import { buildThrottlerOptions, rateLimitKey } from './rate-limit.options.js'

class Resolver {
  @OneTimeLinkOperation()
  link(): void {}
  other(): void {}
}

function contextFor(handler: 'link' | 'other'): ExecutionContext {
  return {
    getHandler: () => Resolver.prototype[handler],
    getClass: () => Resolver,
  } as unknown as ExecutionContext
}

const env = {
  rateLimit: { ...DEFAULT_RATE_LIMITS, links: { max: 3, windowSeconds: 7 } },
} as AppEnv

describe('buildThrottlerOptions', () => {
  const options = buildThrottlerOptions(env, new Reflector())
  const throttlers = (options as { throttlers: ThrottlerOptions[] }).throttlers
  const byName = Object.fromEntries(throttlers.map((t) => [t.name, t]))

  it('turns windows into milliseconds and keeps the maxima', () => {
    expect(byName.general).toMatchObject({ limit: 300, ttl: 60_000 })
    expect(byName.links).toMatchObject({ limit: 3, ttl: 7_000 })
  })

  it('routes a decorated handler to links and everything else to general', async () => {
    expect(await byName.general.skipIf!(contextFor('link'))).toBe(true)
    expect(await byName.links.skipIf!(contextFor('link'))).toBe(false)
    expect(await byName.general.skipIf!(contextFor('other'))).toBe(false)
    expect(await byName.links.skipIf!(contextFor('other'))).toBe(true)
  })

  it('keys counts per group and caller, not per resolver', () => {
    expect(rateLimitKey(contextFor('other'), 'user:u1', 'general')).toBe('general:user:u1')
    expect((options as { generateKey?: unknown }).generateKey).toBe(rateLimitKey)
  })
})
