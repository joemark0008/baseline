import type { ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import type { ThrottlerModuleOptions } from '@nestjs/throttler'
import type { AppEnv, RateLimitRule } from '../config/env.js'
import { GENERAL_GROUP, LINKS_GROUP, isOneTimeLinkOperation } from './rate-limit.decorators.js'

/** Counts are group-wide per caller, not per resolver (the library default). */
export function rateLimitKey(_context: ExecutionContext, tracker: string, group: string): string {
  return `${group}:${tracker}`
}

function throttler(name: string, rule: RateLimitRule, skipIf: (ctx: ExecutionContext) => boolean) {
  return { name, limit: rule.max, ttl: rule.windowSeconds * 1000, skipIf }
}

/** Two disjoint throttlers: `links` for `@OneTimeLinkOperation()` handlers, `general` for the rest. */
export function buildThrottlerOptions(env: AppEnv, reflector: Reflector): ThrottlerModuleOptions {
  const isLink = (ctx: ExecutionContext): boolean => isOneTimeLinkOperation(ctx, reflector)
  return {
    generateKey: rateLimitKey,
    throttlers: [
      throttler(GENERAL_GROUP, env.rateLimit.general, isLink),
      throttler(LINKS_GROUP, env.rateLimit.links, (ctx) => !isLink(ctx)),
    ],
  }
}
