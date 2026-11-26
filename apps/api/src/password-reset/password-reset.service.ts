import { createHash, randomBytes } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { recordAccessChange } from '../access/access-change.js'
import { AccessService } from '../access/access.service.js'
import { AuthPasswords } from '../auth/auth-passwords.js'
import { assertPasswordPolicy } from '../auth/password.js'
import { PrismaService } from '../prisma/prisma.service.js'

/** How long a reset link works (spec Clarifications: 24 hours, one project-wide setting). */
export const PASSWORD_RESET_TTL_MS = 24 * 60 * 60 * 1000

export const INVALID_RESET_LINK = 'This reset link is no longer valid. Ask an admin for a new one.'

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Not used, not revoked, not expired. */
const usable = (now: Date) => ({ usedAt: null, revokedAt: null, expiresAt: { gt: now } })

export interface TokenStatus {
  valid: boolean
  name: string | null
  expiresAt: Date | null
}

/**
 * One-time password reset links that Admins create and deliver themselves (feature 002). This
 * service owns the rules; Better Auth sets the password and ends the sessions (AuthPasswords).
 */
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly passwords: AuthPasswords,
  ) {}

  /** Admin role only. Replaces the person's earlier link. The token is returned once. */
  async create(actorId: string, userId: string): Promise<{ token: string; expiresAt: Date }> {
    await this.assertAdmin(actorId)
    if (actorId === userId) {
      throw new BadRequestException('Change your own password in Settings → Account')
    }
    const person = await this.prisma.client.user.findUnique({ where: { id: userId } })
    if (!person) throw new NotFoundException('User not found')
    if (person.banned) {
      throw new ConflictException('Reactivate this person before resetting their password')
    }
    const token = randomBytes(32).toString('base64url')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS)
    await this.prisma.client.$transaction(async (tx) => {
      await tx.passwordResetLink.updateMany({
        where: { userId, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      })
      await tx.passwordResetLink.create({
        data: { userId, createdById: actorId, tokenHash: hashToken(token), expiresAt },
      })
      await recordAccessChange(tx, {
        actorId,
        kind: 'PASSWORD_RESET_LINK_CREATED',
        userId,
        after: { user: person.name },
      })
    })
    return { token, expiresAt }
  }

  async validate(token: string): Promise<TokenStatus> {
    const link = await this.findUsable(token)
    return link
      ? { valid: true, name: link.user.name, expiresAt: link.expiresAt }
      : { valid: false, name: null, expiresAt: null }
  }

  /**
   * Claims the link first (a conditional update, so only one submission can win), then has
   * Better Auth set the password and end every session, then records it.
   */
  async reset(token: string, newPassword: string): Promise<boolean> {
    assertPasswordPolicy(newPassword)
    const link = await this.findUsable(token)
    if (!link) throw new BadRequestException(INVALID_RESET_LINK)
    const now = new Date()
    const claimed = await this.prisma.client.passwordResetLink.updateMany({
      where: { id: link.id, ...usable(now) },
      data: { usedAt: now },
    })
    if (claimed.count !== 1) throw new BadRequestException(INVALID_RESET_LINK)
    await this.passwords.setPassword(link.userId, newPassword)
    await this.passwords.signOutEverywhere(link.userId)
    await this.prisma.client.$transaction((tx) =>
      recordAccessChange(tx, {
        actorId: link.userId,
        kind: 'PASSWORD_RESET_COMPLETED',
        userId: link.userId,
        after: { user: link.user.name },
      }),
    )
    return true
  }

  /** Admin role only. */
  async cancel(actorId: string, userId: string): Promise<boolean> {
    await this.assertAdmin(actorId)
    const person = await this.prisma.client.user.findUnique({ where: { id: userId } })
    if (!person) throw new NotFoundException('User not found')
    await this.prisma.client.$transaction(async (tx) => {
      const now = new Date()
      const { count } = await tx.passwordResetLink.updateMany({
        where: { userId, ...usable(now) },
        data: { revokedAt: now },
      })
      if (count === 0) throw new NotFoundException('There is no pending reset link to cancel')
      await recordAccessChange(tx, {
        actorId,
        kind: 'PASSWORD_RESET_LINK_CANCELLED',
        userId,
        after: { user: person.name },
      })
    })
    return true
  }

  /**
   * When each person's usable link expires, in one query: for `userIds`, or for everyone (links
   * last a day and there is at most one per person, so the full set stays small).
   */
  async pendingExpiryFor(userIds?: string[]): Promise<Map<string, Date>> {
    if (userIds?.length === 0) return new Map()
    const rows = await this.prisma.client.passwordResetLink.findMany({
      where: { ...(userIds ? { userId: { in: userIds } } : {}), ...usable(new Date()) },
      select: { userId: true, expiresAt: true },
    })
    return new Map(rows.map((r) => [r.userId, r.expiresAt]))
  }

  private async findUsable(token: string) {
    const link = await this.prisma.client.passwordResetLink.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { name: true, banned: true } } },
    })
    const now = new Date()
    const ok =
      link &&
      link.usedAt === null &&
      link.revokedAt === null &&
      link.expiresAt > now &&
      link.user.banned !== true
    return ok ? link : null
  }

  private async assertAdmin(actorId: string): Promise<void> {
    const actor = await this.access.permissionsFor(actorId)
    if (actor.role.kind !== 'ADMIN') throw new ForbiddenException('Only Admins can reset passwords')
  }
}
