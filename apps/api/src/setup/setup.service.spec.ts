import { randomUUID } from 'node:crypto'
import { BadRequestException, ConflictException, Logger } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import { AccessService } from '../access/access.service.js'
import { APP_ENV } from '../config/env.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { AUTH_INSTANCE, hashSetupToken, SetupService } from './setup.service.js'

interface StateRow {
  id: number
  setupComplete: boolean
  setupTokenHash: string | null
}
interface UserRow {
  id: string
  email: string
  name: string
  role: string | null
  emailVerified: boolean
}

/** In-memory stand-ins for the Prisma calls SetupService makes. */
function fakeDb() {
  let state: StateRow | null = null
  const users = new Map<string, UserRow>()
  const client = {
    setupState: {
      findUnique: async () => (state ? { ...state } : null),
      upsert: async ({ create }: { create: { id: number } }) => {
        state ??= { id: create.id, setupComplete: false, setupTokenHash: null }
        return { ...state }
      },
      update: async ({ data }: { data: Partial<StateRow> }) => Object.assign(state!, data),
      updateMany: async ({
        where,
        data,
      }: {
        where: { setupComplete?: boolean }
        data: Partial<StateRow>
      }) => {
        if (
          !state ||
          (where.setupComplete !== undefined && state.setupComplete !== where.setupComplete)
        )
          return { count: 0 }
        Object.assign(state, data)
        return { count: 1 }
      },
    },
    user: {
      findUnique: async ({ where }: { where: { email: string } }) =>
        [...users.values()].find((u) => u.email === where.email) ?? null,
      count: async () => users.size,
      update: async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) =>
        Object.assign(users.get(where.id)!, data),
    },
  }
  const prismaClient = {
    ...client,
    $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) => fn(client),
  }
  return {
    client: prismaClient,
    users,
    getState: () => state,
    setState: (s: StateRow) => (state = s),
  }
}

describe('SetupService', () => {
  let service: SetupService
  let db: ReturnType<typeof fakeDb>
  const createUser = vi.fn()
  const assignRole = vi.fn()
  let log: ReturnType<typeof vi.spyOn>

  async function freshToken(): Promise<string> {
    return service.issueToken()
  }

  beforeEach(async () => {
    db = fakeDb()
    createUser.mockReset()
    assignRole.mockReset()
    createUser.mockImplementation(async ({ body }: { body: { email: string; name: string } }) => {
      const id = randomUUID()
      db.users.set(id, {
        id,
        email: body.email,
        name: body.name,
        role: 'user',
        emailVerified: false,
      })
      return { user: { id } }
    })
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupService,
        { provide: PrismaService, useValue: { client: db.client } },
        { provide: AUTH_INSTANCE, useValue: { api: { createUser } } },
        { provide: AccessService, useValue: { assignRole } },
        { provide: APP_ENV, useValue: { webOrigins: ['http://localhost:4173'] } },
      ],
    }).compile()
    service = module.get(SetupService)
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => log.mockRestore())

  const input = (token: string, over: Partial<Record<string, string>> = {}) => ({
    token,
    name: 'Ada',
    email: 'admin@x.dev',
    password: 'longenough',
    ...over,
  })

  it('boot mints a token and stores only its hash when setup is incomplete', async () => {
    await service.onApplicationBootstrap()
    expect(db.getState()?.setupTokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(log).toHaveBeenCalledTimes(1)
    expect(String(log.mock.calls[0][0])).toContain('http://localhost:4173/setup')
  })

  it('boot does nothing when setup is complete', async () => {
    db.setState({ id: 1, setupComplete: true, setupTokenHash: null })
    await service.onApplicationBootstrap()
    expect(db.getState()?.setupTokenHash).toBeNull()
    expect(log).not.toHaveBeenCalled()
  })

  it('status reports the flag and the password minimum', async () => {
    await service.onApplicationBootstrap()
    expect(await service.status()).toEqual({ setupComplete: false, minPasswordLength: 8 })
  })

  it('completeSetup creates the admin and closes setup', async () => {
    await service.onApplicationBootstrap()
    const token = await freshToken()
    expect(await service.completeSetup(input(token))).toEqual({ email: 'admin@x.dev' })
    expect(createUser).toHaveBeenCalledWith({
      body: { email: 'admin@x.dev', password: 'longenough', name: 'Ada', role: 'admin' },
    })
    expect(createUser.mock.calls[0]).toHaveLength(1)
    const [user] = db.users.values()
    expect(user).toMatchObject({ emailVerified: true })
    expect(assignRole).toHaveBeenCalledWith(user?.id, 'role_admin', expect.anything())
    expect(db.getState()).toMatchObject({ setupComplete: true, setupTokenHash: null })
  })

  it('trims the token and lower-cases the email', async () => {
    await service.onApplicationBootstrap()
    const token = await freshToken()
    expect(await service.completeSetup(input(`  ${token}  `, { email: ' Admin@X.dev ' }))).toEqual({
      email: 'admin@x.dev',
    })
  })

  it('rejects a wrong token with the log hint', async () => {
    await service.onApplicationBootstrap()
    const err = await service.completeSetup(input('nope')).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(BadRequestException)
    expect((err as Error).message).toMatch(/Copy the latest one from the API log/)
  })

  it('rejects when setup is already complete', async () => {
    db.setState({ id: 1, setupComplete: true, setupTokenHash: hashSetupToken('t') })
    await expect(service.completeSetup(input('t'))).rejects.toBeInstanceOf(ConflictException)
  })

  it('rejects a password shorter than 8', async () => {
    await service.onApplicationBootstrap()
    const token = await freshToken()
    await expect(service.completeSetup(input(token, { password: 'short1' }))).rejects.toThrow(
      /at least 8/,
    )
    expect(createUser).not.toHaveBeenCalled()
  })

  it('resumes with an existing user of the same email', async () => {
    await service.onApplicationBootstrap()
    db.users.set('u1', {
      id: 'u1',
      email: 'admin@x.dev',
      name: 'Ada',
      role: 'user',
      emailVerified: false,
    })
    const token = await freshToken()
    await service.completeSetup(input(token, { email: 'ADMIN@x.dev' }))
    expect(createUser).not.toHaveBeenCalled()
    expect(assignRole).toHaveBeenCalledWith('u1', 'role_admin', expect.anything())
    expect(db.getState()?.setupComplete).toBe(true)
  })

  it('refuses when other users exist', async () => {
    await service.onApplicationBootstrap()
    db.users.set('u1', {
      id: 'u1',
      email: 'someone@x.dev',
      name: 'S',
      role: 'user',
      emailVerified: false,
    })
    const token = await freshToken()
    await expect(service.completeSetup(input(token))).rejects.toThrow(/cannot be re-run/)
  })

  it('a second completeSetup after success is refused', async () => {
    await service.onApplicationBootstrap()
    const token = await freshToken()
    await service.completeSetup(input(token))
    await expect(service.completeSetup(input(token))).rejects.toBeInstanceOf(ConflictException)
    expect(createUser).toHaveBeenCalledTimes(1)
  })

  it('issueToken invalidates the previous token', async () => {
    await service.onApplicationBootstrap()
    const first = await freshToken()
    const second = await freshToken()
    await expect(service.completeSetup(input(first))).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.completeSetup(input(second))).resolves.toEqual({ email: 'admin@x.dev' })
  })
})
