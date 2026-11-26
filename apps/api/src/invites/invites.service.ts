import { createHash, randomBytes } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AccessService } from '../access/access.service.js'
import { ADMIN_ROLE_ID, MEMBER_ROLE_ID, type RoleKind } from '../access/role-kind.js'
import { PageArgs } from '../common/pagination/page-args.js'
import { buildPageMeta, toPageQuery } from '../common/pagination/paginate.js'
import { legacyRoleFor, UserRole } from '../common/user-role.enum.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { AcceptInviteResult } from './dto/accept-invite.output.js'
import { InviteValidation } from './dto/invite-validation.output.js'
import { InvitesPage } from './dto/invites-page.output.js'
import { Invite } from './entities/invite.entity.js'

/** Invites expire after seven days. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Tokens are random, shown once, and stored only as a SHA-256 hash. */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

interface InviteRow {
  id: string
  email: string
  roleId: string
  role: { id: string; name: string; kind: RoleKind }
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

const WITH_ROLE = { role: { select: { id: true, name: true, kind: true } } } as const

/** Invitation-only sign-up: issuing, validating, accepting, listing and revoking invites. */
@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /**
   * Issues a fresh invite into a role (Member when none is given), superseding any pending
   * invite for the same email. Only Admins may invite someone into Admin.
   */
  async inviteUser(input: {
    email: string
    roleId?: string | null
    legacyRole?: UserRole | 'admin' | 'user' | null
    invitedById: string
  }): Promise<{ invite: Invite; token: string }> {
    const email = this.normalizeEmail(input.email)
    const roleId =
      input.roleId ?? (input.legacyRole === UserRole.ADMIN ? ADMIN_ROLE_ID : MEMBER_ROLE_ID)
    const role = await this.prisma.client.role.findUnique({ where: { id: roleId } })
    if (!role) throw new NotFoundException('Role not found')
    if (role.kind === 'ADMIN') {
      const actor = await this.access.permissionsFor(input.invitedById)
      if (actor.role.kind !== 'ADMIN') {
        throw new ForbiddenException('Only Admins can invite people into Admin')
      }
    }
    const now = new Date()
    await this.prisma.client.invite.updateMany({
      where: { email, acceptedAt: null, expiresAt: { gt: now } },
      data: { expiresAt: now },
    })
    const token = randomBytes(32).toString('base64url')
    const row = await this.prisma.client.invite.create({
      data: {
        email,
        roleId,
        tokenHash: hashInviteToken(token),
        invitedById: input.invitedById,
        expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
        createdAt: now,
      },
      include: WITH_ROLE,
    })
    return { invite: this.toInvite(row), token }
  }

  async validateToken(token: string): Promise<InviteValidation> {
    const row = await this.findByToken(token)
    if (!row || !this.isUsable(row, new Date())) {
      return { valid: false, email: null, role: null, roleName: null }
    }
    return {
      valid: true,
      email: row.email,
      role: legacyRoleFor(row.role.kind),
      roleName: row.role.name,
    }
  }

  /** Burns the token for the signed-in user and puts them in the invite's role. */
  async accept(
    token: string,
    user: { userId: string; email: string },
  ): Promise<AcceptInviteResult> {
    const now = new Date()
    const row = await this.findByToken(token)
    if (!row) throw new NotFoundException('Invite not found')
    if (row.acceptedAt !== null) throw new ConflictException('Invite already used')
    if (row.expiresAt.getTime() <= now.getTime()) throw new ConflictException('Invite expired')
    if (row.email !== this.normalizeEmail(user.email)) {
      throw new ConflictException('Invite was issued to a different email')
    }
    await this.prisma.client.$transaction(async (tx) => {
      await tx.invite.update({ where: { id: row.id }, data: { acceptedAt: now } })
      await this.access.assignRole(user.userId, row.roleId, tx)
    })
    return { role: legacyRoleFor(row.role.kind), roleName: row.role.name }
  }

  /** Unaccepted, unexpired invites, newest first. */
  async pendingInvites(pageArgs: PageArgs = {}): Promise<InvitesPage> {
    const { page, perPage, skip, take } = toPageQuery(pageArgs)
    const where = { acceptedAt: null, expiresAt: { gt: new Date() } }
    const [rows, total] = await Promise.all([
      this.prisma.client.invite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: WITH_ROLE,
      }),
      this.prisma.client.invite.count({ where }),
    ])
    return { data: rows.map((r) => this.toInvite(r)), meta: buildPageMeta(total, page, perPage) }
  }

  /** Removes a pending invite so its link stops working. */
  async revokeInvite(id: string): Promise<boolean> {
    const row = await this.prisma.client.invite.findUnique({ where: { id } })
    if (!row || row.acceptedAt !== null) throw new NotFoundException('Pending invite not found')
    await this.prisma.client.invite.delete({ where: { id } })
    return true
  }

  /** Used by the sign-up hook; an invalid email simply has no invite. */
  async hasPendingInvite(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalized)) return false
    const now = new Date()
    const pending = await this.prisma.client.invite.findMany({
      where: { email: normalized, acceptedAt: null },
    })
    return pending.some((row) => this.isUsable(row, now))
  }

  private findByToken(token: string): Promise<InviteRow | null> {
    return this.prisma.client.invite.findUnique({
      where: { tokenHash: hashInviteToken(token) },
      include: WITH_ROLE,
    })
  }

  private normalizeEmail(email: string): string {
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalized)) throw new BadRequestException('Invalid email address')
    return normalized
  }

  private isUsable(row: { acceptedAt: Date | null; expiresAt: Date }, now: Date): boolean {
    return row.acceptedAt === null && row.expiresAt.getTime() > now.getTime()
  }

  private toInvite(row: InviteRow): Invite {
    return {
      id: row.id,
      email: row.email,
      role: legacyRoleFor(row.role.kind),
      accessRole: { id: row.role.id, name: row.role.name, kind: row.role.kind },
      expiresAt: row.expiresAt,
      acceptedAt: row.acceptedAt,
      createdAt: row.createdAt,
    }
  }
}
