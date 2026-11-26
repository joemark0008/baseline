import '../src/config/load-dotenv.js'
import 'reflect-metadata'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AccessService } from '../src/feature/access/access.service.js'
import { AppModule } from '../src/app.module.js'
import { APP_ENV, type AppEnv } from '../src/config/env.js'
import { InvitesService } from '../src/feature/invites/invites.service.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

/** Permission enforcement over real HTTP sessions (feature 001-role-permissions, US1). */
const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip

type GqlResult<D> = {
  data: D | null
  errors?: Array<{ message: string; extensions?: { code?: string } }>
}

describeWithDb('Roles and permissions (e2e)', () => {
  let app: INestApplication
  let baseUrl: string
  let origin: string
  const stamp = Date.now()
  const inviterId = `inviter-${stamp}`
  const roleId = `role-e2e-${stamp}`
  const emails: string[] = []

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleFixture.createNestApplication({ bodyParser: false })
    await app.listen(0)
    baseUrl = await app.getUrl()
    origin = app.get<AppEnv>(APP_ENV).webOrigins[0]
    const prisma = app.get(PrismaService).client
    await prisma.user.create({
      data: { id: inviterId, name: 'Inviter', email: `inviter-${stamp}@test.dev` },
    })
    await app.get(AccessService).assignRole(inviterId, 'role_admin')
  })

  afterAll(async () => {
    const prisma = app.get(PrismaService).client
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
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

  /** Invites a person into `role`, signs them up over HTTP and accepts; returns their cookie. */
  async function personIn(role: string, label: string): Promise<{ cookie: string; id: string }> {
    const email = `${label}-${stamp}@test.dev`
    emails.push(email)
    const { token } = await app
      .get(InvitesService)
      .inviteUser({ email, roleId: role, invitedById: inviterId })
    const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email, password: 'longenough', name: label }),
    })
    expect(res.status).toBe(200)
    const cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')
    const accepted = await gql<unknown>(
      cookie,
      'mutation ($t: String!) { acceptInvite(token: $t) { roleName } }',
      {
        t: token,
      },
    )
    expect(accepted.errors).toBeUndefined()
    const { id } = await app.get(PrismaService).client.user.findUniqueOrThrow({ where: { email } })
    return { cookie, id }
  }

  const USERS = '{ findAllUsers { meta { total } } }'
  const INVITE = `mutation ($e: String!) { inviteUser(input: { email: $e }) { inviteUrl } }`

  it('refuses a Member and allows an Admin', async () => {
    const member = await personIn('role_member', 'member')
    const denied = await gql(member.cookie, USERS)
    expect(denied.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    expect(denied.errors?.[0]?.message).toMatch(/^You don't have access to/)
    const deniedInvite = await gql(member.cookie, INVITE, { e: `x-${stamp}@test.dev` })
    expect(deniedInvite.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')

    const admin = await personIn('role_admin', 'admin')
    const ok = await gql<{ findAllUsers: { meta: { total: number } } }>(admin.cookie, USERS)
    expect(ok.errors).toBeUndefined()
    expect(ok.data?.findAllUsers.meta.total).toBeGreaterThan(0)

    const mine = await gql<{ myAccess: { role: { name: string }; permissions: string[] } }>(
      admin.cookie,
      '{ myAccess { role { name } permissions } }',
    )
    expect(mine.data?.myAccess.role.name).toBe('Admin')
    expect(mine.data?.myAccess.permissions).toContain('roles:delete')
  })

  it("applies a role's grant changes on the person's next request", async () => {
    const prisma = app.get(PrismaService).client
    await prisma.role.create({
      data: { id: roleId, name: `E2E ${stamp}`, nameKey: `e2e ${stamp}`, kind: 'CUSTOM' },
    })
    const person = await personIn(roleId, 'custom')
    expect((await gql(person.cookie, USERS)).errors?.[0]?.extensions?.code).toBe('FORBIDDEN')

    await prisma.roleGrant.create({ data: { roleId, area: 'users', action: 'view' } })
    expect((await gql(person.cookie, USERS)).errors).toBeUndefined()

    await prisma.roleGrant.deleteMany({ where: { roleId } })
    expect((await gql(person.cookie, USERS)).errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
  })

  it('deactivates a person: their session ends and sign-in is refused with a clear message', async () => {
    const admin = await personIn('role_admin', 'deact-admin')
    const member = await personIn('role_member', 'deact-member')
    const ME = '{ me { id deactivated } }'
    expect((await gql(member.cookie, ME)).errors).toBeUndefined()

    const done = await gql<{ deactivateUser: { deactivated: boolean } }>(
      admin.cookie,
      'mutation ($id: ID!) { deactivateUser(id: $id) { deactivated } }',
      { id: member.id },
    )
    expect(done.data?.deactivateUser.deactivated).toBe(true)
    expect((await gql(member.cookie, ME)).errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')

    const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email: `deact-member-${stamp}@test.dev`, password: 'longenough' }),
    })
    expect(signIn.status).toBe(403)
    expect(((await signIn.json()) as { message: string }).message).toBe(
      'Your account is deactivated. Ask an admin to reactivate it.',
    )

    const back = await gql<{ reactivateUser: { deactivated: boolean } }>(
      admin.cookie,
      'mutation ($id: ID!) { reactivateUser(id: $id) { deactivated } }',
      { id: member.id },
    )
    expect(back.data?.reactivateUser.deactivated).toBe(false)
  })

  it("blocks Better Auth's admin endpoints over HTTP, even for an Admin", async () => {
    const admin = await personIn('role_admin', 'http-admin')
    const res = await fetch(`${baseUrl}/api/auth/admin/set-role`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: admin.cookie, origin },
      body: JSON.stringify({ userId: admin.id, role: 'user' }),
    })
    expect(res.status).toBe(403)
  })

  it('moves a person between roles through setUserRole and records it', async () => {
    const admin = await personIn('role_admin', 'move-admin')
    const member = await personIn('role_member', 'move-member')
    const moved = await gql<{ setUserRole: { accessRole: { name: string }; role: string } }>(
      admin.cookie,
      'mutation ($i: SetUserRoleInput!) { setUserRole(input: $i) { accessRole { name } role } }',
      { i: { userId: member.id, roleId: 'role_admin' } },
    )
    expect(moved.errors).toBeUndefined()
    expect(moved.data?.setUserRole).toEqual({ accessRole: { name: 'Admin' }, role: 'ADMIN' })
    const self = await gql(
      admin.cookie,
      'mutation ($i: SetUserRoleInput!) { setUserRole(input: $i) { id } }',
      {
        i: { userId: admin.id, roleId: 'role_member' },
      },
    )
    expect(self.errors?.[0]?.message).toBe("You can't change your own role")
    const history = await app.get(PrismaService).client.accessChange.findFirst({
      where: { userId: member.id, kind: 'USER_ROLE_CHANGED' },
    })
    expect(history?.actorId).toBe(admin.id)
  })

  it('computes what the caller may do on the server', async () => {
    const admin = await personIn('role_admin', 'caps-admin')
    const body = await gql<{
      findAllUsers: {
        data: Array<{ id: string; can: { changeRole: boolean; deactivate: boolean } }>
      }
      roles: Array<{ kind: string; can: { rename: boolean; editGrants: boolean } }>
      inviteRoles: Array<{ name: string }>
    }>(
      admin.cookie,
      `{ findAllUsers(perPage: 100) { data { id can { changeRole deactivate } } }
         roles { kind can { rename editGrants } }
         inviteRoles { name } }`,
    )
    expect(body.errors).toBeUndefined()
    const self = body.data?.findAllUsers.data.find((u) => u.id === admin.id)
    expect(self?.can).toEqual({ changeRole: false, deactivate: false })
    expect(body.data?.roles.find((r) => r.kind === 'ADMIN')?.can).toEqual({
      rename: false,
      editGrants: false,
    })
    expect(body.data?.inviteRoles[0].name).toBe('Member')
  })
})
