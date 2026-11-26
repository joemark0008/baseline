import { Inject, Injectable, Logger, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GqlExecutionContext, type GqlContextType } from '@nestjs/graphql'
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler'
import { APP_ENV, type AppEnv } from '../config/env.js'
import { clientIp, type HeaderBag } from './client-ip.js'
import { TooManyRequestsException } from './too-many-requests.exception.js'

interface TrackedRequest {
  headers?: HeaderBag
  ip?: string
  session?: { user?: { id?: unknown } } | null
}

/**
 * Global guard: counts GraphQL and REST requests per signed-in person (or per address) and
 * refuses with a 429 that says how long to wait. Registered after the auth guard so the session
 * is already on the request.
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  private readonly log = new Logger('RateLimit')

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {
    super(options, storage, reflector)
  }

  protected override getRequestResponse(context: ExecutionContext): {
    req: Record<string, unknown>
    res: Record<string, unknown>
  } {
    if (context.getType<GqlContextType>() === 'graphql') {
      const { req, res } = GqlExecutionContext.create(context).getContext<{
        req: Record<string, unknown>
        res: Record<string, unknown>
      }>()
      return { req, res }
    }
    const http = context.switchToHttp()
    return { req: http.getRequest(), res: http.getResponse() }
  }

  protected override async getTracker(req: TrackedRequest): Promise<string> {
    const userId = req.session?.user?.id
    if (typeof userId === 'string' && userId) return `user:${userId}`
    return `ip:${clientIp(req.headers ?? {}, this.env.clientIpHeaders, req.ip)}`
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const group = detail.key.split(':')[0]
    const retryAfter = detail.timeToBlockExpire > 0 ? detail.timeToBlockExpire : detail.timeToExpire
    this.log.warn(
      `Rate limit hit: group=${group} caller=${detail.tracker} limit=${detail.limit}/${Math.round(detail.ttl / 1000)}s path=${context.getHandler().name}`,
    )
    throw new TooManyRequestsException(retryAfter)
  }
}
