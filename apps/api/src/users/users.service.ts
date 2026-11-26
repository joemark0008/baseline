import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { recordAccessChange } from '../access/access-change.js'
import { AccessService, type RoleRef } from '../access/access.service.js'
import { AuthPasswords } from '../auth/auth-passwords.js'
import { MEMBER_ROLE_ID } from '../access/role-kind.js'
import { PageArgs } from '../common/pagination/page-args.js'
import { buildPageMeta, toPageQuery } from '../common/pagination/paginate.js'
import { legacyRoleFor } from '../common/user-role.enum.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { UsersPage } from './dto/users-page.output.js'
import { User } from './entities/user.entity.js'

const ROLE_SELECT = { select: { id: true, name: true, kind: true } } as const
const WITH_ACCESS = { access: { select: { role: ROLE_SELECT } } } as const

interface UserRow {
  id: string
  name: string
  email: string
  username: string | null
  image: string | null
  banned: boolean | null
  createdAt: Date
  access: { role: RoleRef } | null
}

/** Reads people stored by Better Auth, with the role each one has. */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly passwords: AuthPasswords,
  ) {}

  /** Newest first. */
  async findAll(pageArgs: PageArgs = {}): Promise<UsersPage> {
    const { page, perPage, skip, take } = toPageQuery(pageArgs)
    const [rows, total, member] = await Promise.all([
      this.prisma.client.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: WITH_ACCESS,
      }),
      this.prisma.client.user.count(),
      this.memberRole(),
    ])
    return {
      data: rows.map((r) => this.toUser(r, member)),
      meta: buildPageMeta(total, page, perPage),
    }
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.client.user.findUnique({ where: { id }, include: WITH_ACCESS })
    return row ? this.toUser(row, await this.memberRole()) : null
  }

  /** Name and username only; email is never changed here (FR-014c). */
  async updateUser(input: { id: string; name?: string | null; username?: string | null }) {
    await this.getOrThrow(input.id)
    const data: { name?: string; username?: string; displayUsername?: string } = {}
    if (input.name != null) data.name = input.name.trim()
    if (input.username != null) {
      const display = input.username.trim()
      const username = display.toLowerCase()
      const taken = await this.prisma.client.user.findFirst({
        where: { username, id: { not: input.id } },
      })
      if (taken) throw new ConflictException('This username is taken')
      data.username = username
      data.displayUsername = display
    }
    await this.prisma.client.user.update({ where: { id: input.id }, data })
    return this.getOrThrow(input.id)
  }

  /**
   * "Users: Delete": blocks sign-in (Better Auth's `banned`, no expiry), cancels a pending
   * password reset link, and ends every session through Better Auth.
   * Nobody deactivates themselves; only Admins deactivate an Admin; an active Admin must remain.
   */
  async deactivateUser(actorId: string, userId: string): Promise<User> {
    if (actorId === userId) throw new ForbiddenException("You can't deactivate yourself")
    const person = await this.getOrThrow(userId)
    const [actor, target] = await Promise.all([
      this.access.permissionsFor(actorId),
      this.access.permissionsFor(userId),
    ])
    const targetIsAdmin = target.role.kind === 'ADMIN'
    if (targetIsAdmin && actor.role.kind !== 'ADMIN') {
      throw new ForbiddenException('Only Admins can deactivate people in Admin')
    }
    await this.prisma.client.$transaction(async (tx) => {
      if (targetIsAdmin) await this.access.assertAdminRemains(userId, tx)
      await tx.user.update({
        where: { id: userId },
        data: { banned: true, banReason: 'deactivated', banExpires: null },
      })
      await tx.passwordResetLink.updateMany({
        where: { userId, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      await recordAccessChange(tx, {
        actorId,
        kind: 'USER_DEACTIVATED',
        userId,
        after: { user: person.name },
      })
    })
    // After the commit: sign-in is already blocked, so no new session can appear meanwhile.
    await this.passwords.signOutEverywhere(userId)
    return this.getOrThrow(userId)
  }

  /** Admin role only. */
  async reactivateUser(actorId: string, userId: string): Promise<User> {
    const actor = await this.access.permissionsFor(actorId)
    if (actor.role.kind !== 'ADMIN')
      throw new ForbiddenException('Only Admins can reactivate people')
    const person = await this.getOrThrow(userId)
    await this.prisma.client.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { banned: false, banReason: null, banExpires: null },
      })
      await recordAccessChange(tx, {
        actorId,
        kind: 'USER_REACTIVATED',
        userId,
        after: { user: person.name },
      })
    })
    return this.getOrThrow(userId)
  }

  private async getOrThrow(id: string): Promise<User> {
    const user = await this.findById(id)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  private async memberRole(): Promise<RoleRef> {
    const role = await this.prisma.client.role.findUnique({
      where: { id: MEMBER_ROLE_ID },
      ...ROLE_SELECT,
    })
    if (!role) throw new Error('Built-in Member role is missing; run the database migrations')
    return role
  }

  private toUser(row: UserRow, member: RoleRef): User {
    const accessRole = row.access?.role ?? member
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      username: row.username,
      role: legacyRoleFor(accessRole.kind),
      accessRole: { id: accessRole.id, name: accessRole.name, kind: accessRole.kind },
      deactivated: row.banned === true,
      image: row.image,
      createdAt: row.createdAt,
    }
  }
}
