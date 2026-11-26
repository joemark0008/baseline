import { createHash } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AccessService } from '../access/access.service.js'
import { AuthPasswords } from '../auth/auth-passwords.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { PasswordResetService } from './password-reset.service.js'

interface LinkRow {
  id: string
  userId: string
  createdById: string | null
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}
type Where = Partial<{
  id: string
  userId: string | { in: string[] }
  usedAt: null
  revokedAt: null
  expiresAt: { gt: Date }
}>

const PEOPLE: Record<string, { name: string; banned: boolean }> = {
  admin: { name: 'Ada', banned: false },
  bo: { name: 'Bo', banned: false },
  gone: { name: 'Gus', banned: true },
}

const sha256 = (t: string) => createHash('sha256').update(t).digest('hex')

/** In-memory stand-in for the Prisma calls PasswordResetService makes. */
function fakeDb() {
  let seq = 0
  const links: LinkRow[] = []
  const changes: Array<Record<string, unknown>> = []
  const matches = (r: LinkRow, w: Where) =>
    (w.id === undefined || r.id === w.id) &&
    (w.userId === undefined ||
      (typeof w.userId === 'string' ? r.userId === w.userId : w.userId.in.includes(r.userId))) &&
    (w.usedAt === undefined || r.usedAt === null) &&
    (w.revokedAt === undefined || r.revokedAt === null) &&
    (w.expiresAt === undefined || r.expiresAt > w.expiresAt.gt)
  const client = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        PEOPLE[where.id] ? { id: where.id, ...PEOPLE[where.id] } : null,
    },
    passwordResetLink: {
      create: async ({
        data,
      }: {
        data: Omit<LinkRow, 'id' | 'usedAt' | 'revokedAt' | 'createdAt'>
      }) => {
        const row = {
          ...data,
          id: `l${++seq}`,
          usedAt: null,
          revokedAt: null,
          createdAt: new Date(),
        }
        links.push(row)
        return row
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) => {
        const row = links.find((r) => r.tokenHash === where.tokenHash)
        return row ? { ...row, user: PEOPLE[row.userId] } : null
      },
      findMany: async ({ where }: { where: Where }) => links.filter((r) => matches(r, where)),
      updateMany: async ({ where, data }: { where: Where; data: Partial<LinkRow> }) => {
        const hit = links.filter((r) => matches(r, where))
        hit.forEach((r) => Object.assign(r, data))
        return { count: hit.length }
      },
    },
    accessChange: {
      create: async ({ data }: { data: Record<string, unknown> }) => changes.push(data),
    },
  }
  return {
    links,
    changes,
    client: {
      ...client,
      $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) => fn(client),
    },
  }
}

describe('PasswordResetService', () => {
  let db: ReturnType<typeof fakeDb>
  let svc: PasswordResetService
  const passwords = { setPassword: vi.fn(), signOutEverywhere: vi.fn() }
  const access = { permissionsFor: vi.fn() }
  const callerIs = (kind: 'ADMIN' | 'CUSTOM') =>
    access.permissionsFor.mockResolvedValue({
      role: { id: 'r', name: kind, kind },
      permissions: new Set(['users:view', 'users:edit', 'users:delete']),
    })

  beforeEach(async () => {
    vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') })
    vi.clearAllMocks()
    callerIs('ADMIN')
    db = fakeDb()
    const module = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: { client: db.client } },
        { provide: AccessService, useValue: access },
        { provide: AuthPasswords, useValue: passwords },
      ],
    }).compile()
    svc = module.get(PasswordResetService)
  })

  afterEach(() => vi.useRealTimers())

  describe('create', () => {
    it('returns a long random token valid for 24 hours and stores only its hash', async () => {
      const { token, expiresAt } = await svc.create('admin', 'bo')
      expect(Buffer.from(token, 'base64url')).toHaveLength(32)
      expect(expiresAt).toEqual(new Date('2026-01-02T00:00:00Z'))
      expect(db.links).toHaveLength(1)
      expect(db.links[0]).toMatchObject({
        userId: 'bo',
        createdById: 'admin',
        tokenHash: sha256(token),
      })
      expect(JSON.stringify(db.links)).not.toContain(token)
      expect(db.changes).toEqual([
        expect.objectContaining({
          kind: 'PASSWORD_RESET_LINK_CREATED',
          actorId: 'admin',
          userId: 'bo',
          after: { user: 'Bo' },
        }),
      ])
    })

    it('replaces the earlier link for the same person', async () => {
      const first = await svc.create('admin', 'bo')
      const second = await svc.create('admin', 'bo')
      expect((await svc.validate(first.token)).valid).toBe(false)
      expect((await svc.validate(second.token)).valid).toBe(true)
    })

    it('is Admin only, even for a role with every Users permission', async () => {
      callerIs('CUSTOM')
      await expect(svc.create('admin', 'bo')).rejects.toThrow(ForbiddenException)
      await expect(svc.create('admin', 'bo')).rejects.toThrow('Only Admins can reset passwords')
    })

    it('refuses yourself, a deactivated person and an unknown person', async () => {
      await expect(svc.create('admin', 'admin')).rejects.toThrow(
        'Change your own password in Settings → Account',
      )
      await expect(svc.create('admin', 'admin')).rejects.toThrow(BadRequestException)
      await expect(svc.create('admin', 'gone')).rejects.toThrow(ConflictException)
      await expect(svc.create('admin', 'gone')).rejects.toThrow(
        'Reactivate this person before resetting their password',
      )
      await expect(svc.create('admin', 'nobody')).rejects.toThrow(NotFoundException)
    })
  })

  describe('validate', () => {
    it("reports a usable link with the person's name and expiry", async () => {
      const { token, expiresAt } = await svc.create('admin', 'bo')
      expect(await svc.validate(token)).toEqual({ valid: true, name: 'Bo', expiresAt })
    })

    it('reports unknown, expired and revoked links as invalid, without details', async () => {
      const invalid = { valid: false, name: null, expiresAt: null }
      expect(await svc.validate('nope')).toEqual(invalid)
      const { token } = await svc.create('admin', 'bo')
      vi.setSystemTime(new Date('2026-01-02T00:00:01Z'))
      expect(await svc.validate(token)).toEqual(invalid)
    })
  })

  describe('reset', () => {
    const INVALID = 'This reset link is no longer valid. Ask an admin for a new one.'

    it('sets the password, signs the person out everywhere and records it', async () => {
      const { token } = await svc.create('admin', 'bo')
      expect(await svc.reset(token, 'a-new-password')).toBe(true)
      expect(passwords.setPassword).toHaveBeenCalledWith('bo', 'a-new-password')
      expect(passwords.signOutEverywhere).toHaveBeenCalledWith('bo')
      expect(db.links[0].usedAt).toEqual(new Date('2026-01-01T00:00:00Z'))
      expect(db.changes.at(-1)).toMatchObject({
        kind: 'PASSWORD_RESET_COMPLETED',
        actorId: 'bo',
        userId: 'bo',
        after: { user: 'Bo' },
      })
    })

    it('works only once, even for two submissions at the same moment', async () => {
      const { token } = await svc.create('admin', 'bo')
      const results = await Promise.allSettled([
        svc.reset(token, 'first-password'),
        svc.reset(token, 'second-password'),
      ])
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      expect(passwords.setPassword).toHaveBeenCalledTimes(1)
      await expect(svc.reset(token, 'third-password')).rejects.toThrow(INVALID)
    })

    it('refuses an expired, replaced or unknown link', async () => {
      const old = await svc.create('admin', 'bo')
      await svc.create('admin', 'bo')
      await expect(svc.reset(old.token, 'a-new-password')).rejects.toThrow(INVALID)
      await expect(svc.reset('nope', 'a-new-password')).rejects.toThrow(INVALID)
      const { token } = await svc.create('admin', 'bo')
      vi.setSystemTime(new Date('2026-01-03T00:00:00Z'))
      await expect(svc.reset(token, 'a-new-password')).rejects.toThrow(INVALID)
      expect(passwords.setPassword).not.toHaveBeenCalled()
    })

    it('refuses a password that breaks the rules and leaves the link usable', async () => {
      const { token } = await svc.create('admin', 'bo')
      await expect(svc.reset(token, 'short')).rejects.toThrow('Password must be 8–128 characters')
      expect((await svc.validate(token)).valid).toBe(true)
    })
  })

  describe('cancel and pending', () => {
    it('cancels the pending link, Admin only, and records it', async () => {
      const { token } = await svc.create('admin', 'bo')
      callerIs('CUSTOM')
      await expect(svc.cancel('admin', 'bo')).rejects.toThrow(ForbiddenException)
      callerIs('ADMIN')
      expect(await svc.cancel('admin', 'bo')).toBe(true)
      expect(db.links[0].revokedAt).not.toBeNull()
      expect((await svc.validate(token)).valid).toBe(false)
      expect(db.changes.at(-1)).toMatchObject({
        kind: 'PASSWORD_RESET_LINK_CANCELLED',
        actorId: 'admin',
        userId: 'bo',
        after: { user: 'Bo' },
      })
      await expect(svc.cancel('admin', 'bo')).rejects.toThrow(NotFoundException)
    })

    it('reports pending expiries for a page of people in one go', async () => {
      const { expiresAt } = await svc.create('admin', 'bo')
      const pending = await svc.pendingExpiryFor(['bo', 'admin'])
      expect(pending).toEqual(new Map([['bo', expiresAt]]))
      expect(await svc.pendingExpiryFor()).toEqual(new Map([['bo', expiresAt]]))
      vi.setSystemTime(new Date('2026-01-05T00:00:00Z'))
      expect((await svc.pendingExpiryFor(['bo'])).size).toBe(0)
    })
  })
})
