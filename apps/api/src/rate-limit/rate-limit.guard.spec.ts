import { Logger, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerStorage, getOptionsToken, getStorageToken } from '@nestjs/throttler'
import { APP_ENV, DEFAULT_CLIENT_IP_HEADERS, DEFAULT_RATE_LIMITS } from '../config/env.js'
import { RateLimitGuard } from './rate-limit.guard.js'
import { TooManyRequestsException } from './too-many-requests.exception.js'

/** The protected overrides, exposed for the spec. */
type Exposed = {
  getRequestResponse(ctx: ExecutionContext): { req: unknown; res: unknown }
  getTracker(req: unknown): Promise<string>
  throwThrottlingException(ctx: ExecutionContext, detail: unknown): Promise<void>
}

function httpContext(req: unknown): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => 'http-res' }),
    getHandler: () => function check() {},
  } as unknown as ExecutionContext
}

function gqlContext(req: unknown): ExecutionContext {
  // GqlExecutionContext.create reads args[2] as the GraphQL context.
  return {
    getType: () => 'graphql',
    getArgs: () => [undefined, undefined, { req, res: 'gql-res' }, undefined],
    getArgByIndex: (i: number) => [undefined, undefined, { req, res: 'gql-res' }, undefined][i],
    getHandler: () => function validateInviteToken() {},
    getClass: () => class InvitesResolver {},
  } as unknown as ExecutionContext
}

describe('RateLimitGuard', () => {
  let guard: Exposed

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        Reflector,
        { provide: getOptionsToken(), useValue: { throttlers: [] } },
        {
          provide: getStorageToken(),
          useValue: { increment: vi.fn() } as unknown as ThrottlerStorage,
        },
        {
          provide: APP_ENV,
          useValue: { rateLimit: DEFAULT_RATE_LIMITS, clientIpHeaders: DEFAULT_CLIENT_IP_HEADERS },
        },
      ],
    }).compile()
    guard = module.get(RateLimitGuard) as unknown as Exposed
  })

  it('reads the request from the GraphQL context or from HTTP', () => {
    expect(guard.getRequestResponse(gqlContext('gql-req'))).toEqual({
      req: 'gql-req',
      res: 'gql-res',
    })
    expect(guard.getRequestResponse(httpContext('http-req'))).toEqual({
      req: 'http-req',
      res: 'http-res',
    })
  })

  it('tracks a signed-in person by account and everyone else by address', async () => {
    expect(await guard.getTracker({ session: { user: { id: 'u1' } }, ip: '10.0.0.1' })).toBe(
      'user:u1',
    )
    expect(
      await guard.getTracker({
        session: null,
        headers: { 'cf-connecting-ip': '203.0.113.9' },
        ip: '10.0.0.1',
      }),
    ).toBe('ip:203.0.113.9')
    expect(await guard.getTracker({ headers: {}, ip: '::ffff:10.0.0.1' })).toBe('ip:10.0.0.1')
    expect(await guard.getTracker({})).toBe('ip:unknown')
  })

  it('logs the refusal without request contents and throws a 429 with the wait', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const detail = {
      key: 'links:ip:203.0.113.9',
      tracker: 'ip:203.0.113.9',
      limit: 10,
      ttl: 60_000,
      totalHits: 11,
      timeToExpire: 60,
      isBlocked: true,
      timeToBlockExpire: 42,
    }
    const ctx = gqlContext({ body: { variables: { token: 'secret-token' } } })
    await expect(guard.throwThrottlingException(ctx, detail)).rejects.toMatchObject({
      retryAfter: 42,
      message: 'Too many requests. Try again in 42 seconds.',
    })
    await expect(guard.throwThrottlingException(ctx, detail)).rejects.toBeInstanceOf(
      TooManyRequestsException,
    )
    expect(warn).toHaveBeenCalledWith(
      'Rate limit hit: group=links caller=ip:203.0.113.9 limit=10/60s path=validateInviteToken',
    )
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-token')
    warn.mockRestore()
  })

  it('never reports a zero wait', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const detail = {
      key: 'general:ip:x',
      tracker: 'ip:x',
      limit: 1,
      ttl: 1000,
      timeToExpire: 0,
      timeToBlockExpire: 0,
    }
    await expect(guard.throwThrottlingException(httpContext({}), detail)).rejects.toMatchObject({
      retryAfter: 1,
    })
    vi.restoreAllMocks()
  })
})
