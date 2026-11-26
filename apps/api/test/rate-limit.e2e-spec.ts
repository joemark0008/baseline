import '../src/config/load-dotenv.js'
import 'reflect-metadata'
import { Logger, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

/**
 * Feature 003-rate-limiting over real HTTP. The limits are lowered through the environment
 * *before* the app module is imported, because `auth.config.ts` reads them at import time.
 */
const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip

type GqlResult<D> = {
  data: D | null
  errors?: Array<{ message: string; extensions?: { code?: string; retryAfter?: number } }>
}

const SIGN_IN_MAX = 2
const SIGN_IN_WINDOW = 2
const LINKS_MAX = 2
const GENERAL_MAX = 20
const GENERAL_WINDOW = 3

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

describeWithDb('Rate limiting (e2e)', () => {
  let app: INestApplication
  let baseUrl: string
  let origin: string
  const stamp = Date.now()
  const warnings: string[] = []
  const emails: string[] = []
  let inviterId: string | undefined
  // Resolved after the dynamic import so the lowered limits are what the module sees.
  let services: {
    PrismaService: typeof import('../src/prisma/prisma.service.js').PrismaService
    InvitesService: typeof import('../src/feature/invites/invites.service.js').InvitesService
    AccessService: typeof import('../src/feature/access/access.service.js').AccessService
  }

  beforeAll(async () => {
    process.env.RATE_LIMIT_SIGN_IN_MAX = String(SIGN_IN_MAX)
    process.env.RATE_LIMIT_SIGN_IN_WINDOW = String(SIGN_IN_WINDOW)
    process.env.RATE_LIMIT_LINKS_MAX = String(LINKS_MAX)
    process.env.RATE_LIMIT_GENERAL_MAX = String(GENERAL_MAX)
    process.env.RATE_LIMIT_GENERAL_WINDOW = String(GENERAL_WINDOW)
    vi.spyOn(Logger.prototype, 'warn').mockImplementation((message: unknown) => {
      warnings.push(String(message))
    })
    const { AppModule } = await import('../src/app.module.js')
    const { APP_ENV } = await import('../src/config/env.js')
    const { corsOptions } = await import('../src/config/cors.js')
    services = {
      PrismaService: (await import('../src/prisma/prisma.service.js')).PrismaService,
      InvitesService: (await import('../src/feature/invites/invites.service.js')).InvitesService,
      AccessService: (await import('../src/feature/access/access.service.js')).AccessService,
    }
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleFixture.createNestApplication({ bodyParser: false })
    const env = app.get<{ webOrigins: string[] }>(APP_ENV)
    app.enableCors(corsOptions(env)) // as main.ts does
    await app.listen(0)
    baseUrl = await app.getUrl()
    origin = env.webOrigins[0]
  })

  afterAll(async () => {
    const prisma = app.get(services.PrismaService).client
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    if (inviterId) {
      await prisma.invite.deleteMany({ where: { invitedById: inviterId } })
      await prisma.user.deleteMany({ where: { id: inviterId } })
    }
    await app.close()
    vi.restoreAllMocks()
  })

  async function gql<D>(query: string, variables?: object, cookie = ''): Promise<GqlResult<D>> {
    const res = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin, cookie },
      body: JSON.stringify({ query, variables }),
    })
    return (await res.json()) as GqlResult<D>
  }

  const refusal = (body: GqlResult<unknown>) =>
    body.errors?.find((e) => e.extensions?.code === 'TOO_MANY_REQUESTS')

  function signInAttempt(): Promise<Response> {
    return fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email: `nobody-${stamp}@test.dev`, password: 'wrong-password' }),
    })
  }

  /** Invites and signs up a person (sign-up is in the sign-in group: at most SIGN_IN_MAX per window). */
  async function personIn(label: string): Promise<string> {
    const prisma = app.get(services.PrismaService).client
    if (!inviterId) {
      inviterId = `rl-inviter-${stamp}`
      await prisma.user.create({
        data: { id: inviterId, name: 'Inviter', email: `rl-inviter-${stamp}@test.dev` },
      })
      await app.get(services.AccessService).assignRole(inviterId, 'role_admin')
    }
    const email = `rl-${label}-${stamp}@test.dev`
    emails.push(email)
    await app
      .get(services.InvitesService)
      .inviteUser({ email, roleId: 'role_member', invitedById: inviterId })
    const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email, password: 'longenough', name: label }),
    })
    expect(res.status).toBe(200)
    return res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')
  }

  describe('US1 sign-in', () => {
    it('refuses the attempt after the limit, before checking credentials, and says how long to wait', async () => {
      const first = await signInAttempt()
      const second = await signInAttempt()
      const third = await signInAttempt()
      expect([first.status, second.status, third.status]).toEqual([401, 401, 429])
      expect(Number(third.headers.get('x-retry-after'))).toBeGreaterThanOrEqual(1)
      expect(Number(third.headers.get('x-retry-after'))).toBeLessThanOrEqual(SIGN_IN_WINDOW)
      expect(((await third.json()) as { message: string }).message).toMatch(/Too many requests/)
      expect(third.headers.get('access-control-expose-headers')?.toLowerCase()).toContain(
        'x-retry-after',
      )
    })

    it('evaluates credentials again once the window has passed', async () => {
      await sleep(SIGN_IN_WINDOW * 1000 + 200)
      expect((await signInAttempt()).status).toBe(401)
    })
  })

  describe('US2 one-time links', () => {
    const VALIDATE_INVITE = 'query ($t: String!) { validateInviteToken(token: $t) { valid } }'
    const VALIDATE_RESET = 'query ($t: String!) { validatePasswordResetToken(token: $t) { valid } }'

    it('refuses token checks after the limit with a distinct code and the wait', async () => {
      const one = await gql<{ validateInviteToken: { valid: boolean } }>(VALIDATE_INVITE, {
        t: 'guess-1',
      })
      const two = await gql<{ validateInviteToken: { valid: boolean } }>(VALIDATE_INVITE, {
        t: 'guess-2',
      })
      expect(one.data?.validateInviteToken.valid).toBe(false)
      expect(two.data?.validateInviteToken.valid).toBe(false)

      const three = await gql(VALIDATE_INVITE, { t: 'guess-3' })
      const refused = refusal(three)
      expect(refused).toBeDefined()
      expect(refused?.extensions?.retryAfter).toBeGreaterThanOrEqual(1)
      expect(refused?.message).toBe(
        `Too many requests. Try again in ${refused?.extensions?.retryAfter} seconds.`,
      )
      expect(three.data).toBeNull()
    })

    it('shares the count across the four link operations but not with the general group', async () => {
      expect(refusal(await gql(VALIDATE_RESET, { t: 'guess-4' }))).toBeDefined()
      const status = await gql<{ setupStatus: { setupComplete: boolean } }>(
        '{ setupStatus { setupComplete } }',
      )
      expect(status.errors).toBeUndefined()
      expect(typeof status.data?.setupStatus.setupComplete).toBe('boolean')
    })
  })

  describe('US3 fair use', () => {
    const SETUP_STATUS = '{ setupStatus { setupComplete } }'
    const MY_ACCESS = '{ myAccess { permissions } }'

    async function burst(cookie: string, count: number): Promise<Array<GqlResult<unknown>>> {
      const out: Array<GqlResult<unknown>> = []
      for (let i = 0; i < count; i++)
        out.push(await gql(cookie ? MY_ACCESS : SETUP_STATUS, undefined, cookie))
      return out
    }

    it('refuses an anonymous caller past the general limit while the health check stays open', async () => {
      const results = await burst('', GENERAL_MAX + 2)
      expect(results.slice(0, GENERAL_MAX - 1).every((r) => !r.errors)).toBe(true)
      expect(refusal(results[results.length - 1])).toBeDefined()
      for (let i = 0; i < 3; i++) expect((await fetch(`${baseUrl}/health`)).status).toBe(200)
    })

    it('counts signed-in people per account, keeps their session on refusal, and lets them back in after the window', async () => {
      const alice = await personIn('alice')
      const bob = await personIn('bob')
      // The anonymous caller above is exhausted, yet both people still have their own budget.
      expect((await burst(alice, 5)).every((r) => !r.errors)).toBe(true)
      expect((await burst(bob, 5)).every((r) => !r.errors)).toBe(true)

      const results = await burst(alice, GENERAL_MAX)
      const refused = refusal(results[results.length - 1])
      expect(refused).toBeDefined()
      expect(
        results[results.length - 1].errors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED'),
      ).toBe(false)

      await sleep(GENERAL_WINDOW * 1000 + 300)
      const again = await gql<{ myAccess: { permissions: string[] } }>(MY_ACCESS, undefined, alice)
      expect(again.errors).toBeUndefined()
      expect(Array.isArray(again.data?.myAccess.permissions)).toBe(true)
    })
  })

  describe('US4 operators', () => {
    it('logged every refusal on both layers without credentials or tokens', () => {
      const hits = warnings.filter((w) => w.startsWith('Rate limit hit:'))
      const line =
        /^Rate limit hit: group=(sign-in|links|general) caller=(ip|user):\S+ limit=\d+\/\d+s path=\S+$/
      expect(hits.every((h) => line.test(h))).toBe(true)
      expect(
        hits.filter((h) => h.includes('group=sign-in') && h.includes('path=/sign-in/email')),
      ).toHaveLength(1)
      expect(
        hits.filter((h) => h.includes('group=links') && h.includes('path=validateInviteToken')),
      ).toHaveLength(1)
      expect(
        hits.filter(
          (h) => h.includes('group=links') && h.includes('path=validatePasswordResetToken'),
        ),
      ).toHaveLength(1)
      expect(hits.some((h) => h.includes('group=general') && h.includes('caller=ip:'))).toBe(true)
      expect(hits.some((h) => h.includes('group=general') && h.includes('caller=user:'))).toBe(true)
      const joined = hits.join('\n')
      expect(joined).not.toContain('wrong-password')
      expect(joined).not.toContain('guess-')
      expect(joined).not.toContain('longenough')
    })
  })
})
