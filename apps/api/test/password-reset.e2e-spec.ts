import '../src/config/load-dotenv.js'
import 'reflect-metadata'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AccessService } from '../src/access/access.service.js'
import { AppModule } from '../src/app.module.js'
import { APP_ENV, type AppEnv } from '../src/config/env.js'
import { InvitesService } from '../src/invites/invites.service.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

/** Password resets and changes over real HTTP sessions (feature 002-password-reset). */
const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip

type GqlResult<D> = {
  data: D | null
  errors?: Array<{ message: string; extensions?: { code?: string } }>
}

describeWithDb('Password reset and change (e2e)', () => {
  let app: INestApplication
  let baseUrl: string
  let origin: string
  const stamp = Date.now()
  const inviterId = `pw-inviter-${stamp}`
  const roleId = `pw-role-${stamp}`
  const emails: string[] = []
  const PASSWORD = 'longenough'

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleFixture.createNestApplication({ bodyParser: false })
    await app.listen(0)
    baseUrl = await app.getUrl()
    origin = app.get<AppEnv>(APP_ENV).webOrigins[0]
    const prisma = app.get(PrismaService).client
    await prisma.user.create({
      data: { id: inviterId, name: 'Inviter', email: `pw-inviter-${stamp}@test.dev` },
    })
    await app.get(AccessService).assignRole(inviterId, 'role_admin')
  })

  afterAll(async () => {
    const prisma = app.get(PrismaService).client
    const ids = (await prisma.user.findMany({ where: { email: { in: emails } } })).map((u) => u.id)
    await prisma.accessChange.deleteMany({ where: { userId: { in: ids } } })
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
    await prisma.invite.deleteMany({ where: { invitedById: inviterId } })
    await prisma.user.deleteMany({ where: { id: inviterId } })
    await prisma.role.deleteMany({ where: { id: roleId } })
    await app.close()
  })

  async function gql<D>(cookie: string, query: string, variables?: object): Promise<GqlResult<D>> {
    const res = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, origin },
      body: JSON.stringify({ query, variables }),
    })
    return (await res.json()) as GqlResult<D>
  }

  const cookieOf = (res: Response) =>
    res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')

  function signIn(email: string, password: string): Promise<Response> {
    return fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email, password }),
    })
  }

  /** Invites a person into `role`, signs them up over HTTP and accepts. */
  async function personIn(role: string, label: string) {
    const email = `pw-${label}-${stamp}@test.dev`
    emails.push(email)
    const { token } = await app
      .get(InvitesService)
      .inviteUser({ email, roleId: role, invitedById: inviterId })
    const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email, password: PASSWORD, name: label }),
    })
    expect(res.status).toBe(200)
    const cookie = cookieOf(res)
    const accepted = await gql(
      cookie,
      'mutation ($t: String!) { acceptInvite(token: $t) { roleName } }',
      {
        t: token,
      },
    )
    expect(accepted.errors).toBeUndefined()
    const { id } = await app.get(PrismaService).client.user.findUniqueOrThrow({ where: { email } })
    return { cookie, id, email }
  }

  const ME = '{ me { id } }'
  const CREATE = 'mutation ($u: ID!) { createPasswordResetLink(userId: $u) { url expiresAt } }'
  const VALIDATE = 'query ($t: String!) { validatePasswordResetToken(token: $t) { valid name } }'
  const RESET = 'mutation ($i: ResetPasswordInput!) { resetPassword(input: $i) }'
  const CHANGE = 'mutation ($i: ChangePasswordInput!) { changePassword(input: $i) }'
  const INVALID = 'This reset link is no longer valid. Ask an admin for a new one.'

  it('lets an Admin create a one-time link that sets a new password and signs out everywhere', async () => {
    const admin = await personIn('role_admin', 'admin')
    const member = await personIn('role_member', 'member')
    const created = await gql<{ createPasswordResetLink: { url: string } }>(admin.cookie, CREATE, {
      u: member.id,
    })
    expect(created.errors).toBeUndefined()
    const url = new URL(created.data!.createPasswordResetLink.url)
    expect(url.pathname).toBe('/reset-password')
    const token = url.searchParams.get('token')!

    const checked = await gql<{ validatePasswordResetToken: { valid: boolean; name: string } }>(
      '',
      VALIDATE,
      { t: token },
    )
    expect(checked.data?.validatePasswordResetToken).toEqual({ valid: true, name: 'member' })

    const listed = await gql<{
      findAllUsers: { data: Array<{ id: string; passwordResetExpiresAt: string | null }> }
    }>(admin.cookie, '{ findAllUsers(perPage: 100) { data { id passwordResetExpiresAt } } }')
    expect(
      listed.data?.findAllUsers.data.find((u) => u.id === member.id)?.passwordResetExpiresAt,
    ).toBeTruthy()

    expect((await gql(member.cookie, ME)).errors).toBeUndefined()
    const done = await gql<{ resetPassword: boolean }>('', RESET, {
      i: { token, newPassword: 'brand-new-password' },
    })
    expect(done.errors).toBeUndefined()
    expect(done.data?.resetPassword).toBe(true)

    expect((await gql(member.cookie, ME)).errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    expect((await signIn(member.email, PASSWORD)).status).toBe(401)
    expect((await signIn(member.email, 'brand-new-password')).status).toBe(200)

    const again = await gql('', RESET, { i: { token, newPassword: 'another-password' } })
    expect(again.errors?.[0]?.message).toBe(INVALID)
  })

  it('refuses a role with every Users permission, because resets are Admin only', async () => {
    const prisma = app.get(PrismaService).client
    await prisma.role.create({
      data: { id: roleId, name: `PW ${stamp}`, nameKey: `pw ${stamp}`, kind: 'CUSTOM' },
    })
    await prisma.roleGrant.createMany({
      data: ['view', 'add', 'edit', 'delete'].map((action) => ({ roleId, area: 'users', action })),
    })
    const manager = await personIn(roleId, 'manager')
    const target = await personIn('role_member', 'target')
    const denied = await gql(manager.cookie, CREATE, { u: target.id })
    expect(denied.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    expect(denied.errors?.[0]?.message).toBe('Only Admins can reset passwords')
  })

  it('changes your own password: this session stays, the others end', async () => {
    const person = await personIn('role_member', 'self')
    const other = cookieOf(await signIn(person.email, PASSWORD))
    expect((await gql(other, ME)).errors).toBeUndefined()

    const wrong = await gql(person.cookie, CHANGE, {
      i: { currentPassword: 'not-it-at-all', newPassword: 'changed-password' },
    })
    expect(wrong.errors?.[0]?.message).toBe('Your current password is incorrect.')

    const ok = await gql<{ changePassword: boolean }>(person.cookie, CHANGE, {
      i: { currentPassword: PASSWORD, newPassword: 'changed-password' },
    })
    expect(ok.errors).toBeUndefined()
    expect((await gql(person.cookie, ME)).errors).toBeUndefined()
    expect((await gql(other, ME)).errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    expect((await signIn(person.email, 'changed-password')).status).toBe(200)
  })

  it("blocks Better Auth's own password endpoints over HTTP", async () => {
    const person = await personIn('role_member', 'http')
    for (const path of ['/change-password', '/request-password-reset', '/reset-password']) {
      const res = await fetch(`${baseUrl}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: person.cookie, origin },
        body: JSON.stringify({
          currentPassword: PASSWORD,
          newPassword: 'sneaky-password',
          email: person.email,
          token: 'x',
        }),
      })
      expect(res.status, path).toBe(403)
    }
  })

  it('records every password event in History with names only', async () => {
    const admin = await personIn('role_admin', 'hist-admin')
    const member = await personIn('role_member', 'hist-member')
    await gql(admin.cookie, CREATE, { u: member.id })
    await gql(admin.cookie, 'mutation ($u: ID!) { cancelPasswordResetLink(userId: $u) }', {
      u: member.id,
    })
    const link = await gql<{ createPasswordResetLink: { url: string } }>(admin.cookie, CREATE, {
      u: member.id,
    })
    const token = new URL(link.data!.createPasswordResetLink.url).searchParams.get('token')!
    await gql('', RESET, { i: { token, newPassword: 'history-password' } })
    const fresh = cookieOf(await signIn(member.email, 'history-password'))
    await gql(fresh, CHANGE, {
      i: { currentPassword: 'history-password', newPassword: 'history-password-2' },
    })

    const rows = await app.get(PrismaService).client.accessChange.findMany({
      where: {
        userId: member.id,
        kind: {
          in: [
            'PASSWORD_RESET_LINK_CREATED',
            'PASSWORD_RESET_LINK_CANCELLED',
            'PASSWORD_RESET_COMPLETED',
            'PASSWORD_CHANGED',
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    expect(rows.map((r) => r.kind)).toEqual([
      'PASSWORD_RESET_LINK_CREATED',
      'PASSWORD_RESET_LINK_CANCELLED',
      'PASSWORD_RESET_LINK_CREATED',
      'PASSWORD_RESET_COMPLETED',
      'PASSWORD_CHANGED',
    ])
    const stored = JSON.stringify(rows)
    expect(stored).not.toContain(token)
    expect(stored).not.toContain('history-password')
  })
})
