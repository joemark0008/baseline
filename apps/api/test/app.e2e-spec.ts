import '../src/config/load-dotenv.js'
import 'reflect-metadata'
import type { INestApplication } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import { AppModule } from '../src/app.module.js'
import { InvitesService } from '../src/feature/invites/invites.service.js'
import { PrismaService } from '../src/prisma/prisma.service.js'
import { SetupService } from '../src/feature/setup/setup.service.js'

/** Boots the real AppModule against the database in DATABASE_URL (CI: the Postgres service). */
const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip

describeWithDb('AppModule (e2e)', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication({ bodyParser: false })
    await app.listen(0)
    baseUrl = await app.getUrl()
  })

  afterAll(() => app.close())

  async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    return (await res.json()) as T
  }

  type GqlResult<D> = { data: D | null; errors?: Array<{ extensions?: { code?: string } }> }
  const COMPLETE = `mutation ($input: CompleteSetupInput!) { completeSetup(input: $input) { email } }`

  it('setupStatus is public', async () => {
    const body = await gql<
      GqlResult<{ setupStatus: { setupComplete: boolean; minPasswordLength: number } }>
    >('{ setupStatus { setupComplete minPasswordLength } }')
    expect(body.data?.setupStatus.minPasswordLength).toBe(8)
  })

  it('completeSetup creates the first admin once', async () => {
    const prisma = app.get(PrismaService).client
    const setup = app.get(SetupService)
    const fresh = (await prisma.user.count()) === 0 && !(await setup.status()).setupComplete
    const input = { name: 'First Admin', email: 'first-admin@test.dev', password: 'longenough' }

    if (!fresh) {
      // Already set up (e.g. a developer database): the wizard must refuse.
      const body = await gql<GqlResult<unknown>>(COMPLETE, { input: { ...input, token: 'bogus' } })
      expect(['CONFLICT', 'BAD_REQUEST']).toContain(body.errors?.[0]?.extensions?.code)
      return
    }

    const token = await setup.issueToken()
    const ok = await gql<GqlResult<{ completeSetup: { email: string } }>>(COMPLETE, {
      input: { ...input, token },
    })
    expect(ok.data?.completeSetup.email).toBe('first-admin@test.dev')
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'first-admin@test.dev' } })
    expect(admin.role).toBe('admin')
    const access = await prisma.userAccess.findUnique({ where: { userId: admin.id } })
    expect(access?.roleId).toBe('role_admin')

    const again = await gql<GqlResult<unknown>>(COMPLETE, { input: { ...input, token } })
    expect(again.errors?.[0]?.extensions?.code).toBe('CONFLICT')
    expect((await setup.status()).setupComplete).toBe(true)
  })

  it('GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  it('validateInviteToken is public', async () => {
    const res = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ validateInviteToken(token: "nope") { valid } }' }),
    })
    expect(await res.json()).toEqual({ data: { validateInviteToken: { valid: false } } })
  })

  it('findAllUsers requires a session', async () => {
    const res = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ findAllUsers { meta { total } } }' }),
    })
    const body = (await res.json()) as { data: unknown; errors?: unknown[] }
    expect(body.errors?.length).toBeGreaterThan(0)
  })

  it('rejects perPage above the maximum', async () => {
    const res = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ findAllUsers(perPage: 1000) { meta { total } } }' }),
    })
    const body = (await res.json()) as { data: unknown; errors?: unknown[] }
    expect(body.errors?.length).toBeGreaterThan(0)
  })

  it('invites persist through Prisma: issue, validate, accept', async () => {
    const prisma = app.get(PrismaService).client
    const invites = app.get(InvitesService)
    const stamp = Date.now()
    const admin = await prisma.user.create({
      data: { id: `admin-${stamp}`, name: 'Admin', email: `admin-${stamp}@test.dev` },
    })
    const invitee = await prisma.user.create({
      data: { id: `user-${stamp}`, name: 'New', email: `new-${stamp}@test.dev` },
    })
    await prisma.userAccess.create({ data: { userId: admin.id, roleId: 'role_admin' } })
    try {
      const { token } = await invites.inviteUser({
        email: invitee.email,
        roleId: 'role_admin',
        invitedById: admin.id,
      })
      expect(await invites.hasPendingInvite(invitee.email)).toBe(true)
      expect((await invites.validateToken(token)).valid).toBe(true)
      expect(await invites.accept(token, { userId: invitee.id, email: invitee.email })).toEqual({
        role: 'admin',
        roleName: 'Admin',
      })
      expect((await prisma.user.findUniqueOrThrow({ where: { id: invitee.id } })).role).toBe(
        'admin',
      )
      expect((await invites.validateToken(token)).valid).toBe(false)
    } finally {
      await prisma.user.deleteMany({ where: { id: { in: [admin.id, invitee.id] } } })
    }
  })
})
