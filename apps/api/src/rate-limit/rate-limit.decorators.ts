import { SetMetadata, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SkipThrottle } from '@nestjs/throttler'

/** Throttler names. `general` counts every operation except the ones in `links`. */
export const GENERAL_GROUP = 'general'
export const LINKS_GROUP = 'links'
export const RATE_LIMIT_GROUPS = [GENERAL_GROUP, LINKS_GROUP] as const

export const ONE_TIME_LINK_OPERATION = 'rateLimit:oneTimeLinkOperation'
const THROTTLER_SKIP = 'THROTTLER:SKIP'

/** Marks a public token operation (invite check, reset link, setup) as part of the `links` group. */
export const OneTimeLinkOperation = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ONE_TIME_LINK_OPERATION, true)

/** Exempts a route from every group. Only the health check should need it. */
export const ExemptFromRateLimit = (): MethodDecorator & ClassDecorator =>
  SkipThrottle(Object.fromEntries(RATE_LIMIT_GROUPS.map((g) => [g, true])))

export function isOneTimeLinkOperation(context: ExecutionContext, reflector: Reflector): boolean {
  return (
    reflector.getAllAndOverride<boolean | undefined>(ONE_TIME_LINK_OPERATION, [
      context.getHandler(),
      context.getClass(),
    ]) === true
  )
}

/** For specs: whether `@ExemptFromRateLimit()` is on a class or method. */
export function isExemptFromRateLimit(target: object): boolean {
  return RATE_LIMIT_GROUPS.every(
    (g) => (Reflect.getMetadata(THROTTLER_SKIP + g, target) as boolean | undefined) === true,
  )
}
