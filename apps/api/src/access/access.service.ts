import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService, type PrismaTx } from '../prisma/prisma.service.js'
import { recordAccessChange } from './access-change.js'
import { effectivePermissions, type PermissionKey } from './access-policy.js'
import { ADMIN_ROLE_ID, MEMBER_ROLE_ID, type RoleKind } from './role-kind.js'

export interface RoleRef {
  id: string
  name: string
  kind: RoleKind
}

export interface PersonAccess {
  role: RoleRef
  permissions: Set<PermissionKey>
}

/** Reads a person's role and effective permissions. Read fresh on every request (FR-007). */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly perRequest = new WeakMap<object, Promise<PersonAccess>>()

  /** `permissionsFor` memoised per request, for field resolvers that run once per row. */
  forRequest(req: object, userId: string): Promise<PersonAccess> {
    let found = this.perRequest.get(req)
    if (!found) {
      found = this.permissionsFor(userId)
      this.perRequest.set(req, found)
    }
    return found
  }

  async permissionsFor(userId: string): Promise<PersonAccess> {
    const row = await this.prisma.client.userAccess.findUnique({
      where: { userId },
      include: { role: { include: { grants: true } } },
    })
    const role =
      row?.role ??
      (await this.prisma.client.role.findUnique({
        where: { id: MEMBER_ROLE_ID },
        include: { grants: true },
      }))
    if (!role) throw new Error('Built-in Member role is missing; run the database migrations')
    return {
      role: { id: role.id, name: role.name, kind: role.kind },
      permissions: effectivePermissions(role.kind, role.grants),
    }
  }

  /**
   * Puts a person in a role and keeps Better Auth's `user.role` in step (Admin role ⇒ `admin`).
   * No permission checks: callers (invite acceptance, setup, `setUserRole`) decide who may do it.
   * Pass `tx` to join a caller's transaction.
   */
  async assignRole(userId: string, roleId: string, tx?: PrismaTx): Promise<RoleRef> {
    const run = async (db: PrismaTx): Promise<RoleRef> => {
      const role = await db.role.findUnique({ where: { id: roleId } })
      if (!role) throw new NotFoundException('Role not found')
      await db.userAccess.upsert({
        where: { userId },
        create: { userId, roleId },
        update: { roleId },
      })
      await db.user.update({
        where: { id: userId },
        data: { role: role.kind === 'ADMIN' ? 'admin' : 'user' },
      })
      return { id: role.id, name: role.name, kind: role.kind }
    }
    return tx ? run(tx) : this.prisma.client.$transaction(run)
  }

  /**
   * Moves a person into another role on someone's behalf (FR-011–FR-013): nobody changes their
   * own role, only Admins move people into or out of Admin, and an active Admin must remain.
   */
  async setUserRole(actorId: string, userId: string, roleId: string): Promise<RoleRef> {
    if (actorId === userId) throw new ForbiddenException("You can't change your own role")
    const [actor, current] = await Promise.all([
      this.permissionsFor(actorId),
      this.permissionsFor(userId),
    ])
    const target = await this.prisma.client.role.findUnique({ where: { id: roleId } })
    if (!target) throw new NotFoundException('Role not found')
    const touchesAdmin = current.role.kind === 'ADMIN' || target.kind === 'ADMIN'
    if (touchesAdmin && actor.role.kind !== 'ADMIN') {
      throw new ForbiddenException('Only Admins can move people into or out of Admin')
    }
    const person = await this.prisma.client.user.findUnique({ where: { id: userId } })
    if (!person) throw new NotFoundException('User not found')
    return this.prisma.client.$transaction(async (tx) => {
      if (current.role.kind === 'ADMIN' && target.kind !== 'ADMIN') {
        await this.assertAdminRemains(userId, tx)
      }
      const role = await this.assignRole(userId, roleId, tx)
      await recordAccessChange(tx, {
        actorId,
        kind: 'USER_ROLE_CHANGED',
        userId,
        roleId,
        before: { user: person.name, role: current.role.name },
        after: { user: person.name, role: role.name },
      })
      return role
    })
  }

  /** Throws unless someone other than `userId` is an active (not deactivated) Admin. */
  async assertAdminRemains(userId: string, tx?: PrismaTx): Promise<void> {
    const db = tx ?? this.prisma.client
    const others = await db.userAccess.count({
      where: {
        roleId: ADMIN_ROLE_ID,
        userId: { not: userId },
        user: { OR: [{ banned: false }, { banned: null }] },
      },
    })
    if (others === 0) throw new ConflictException('At least one active person must stay in Admin')
  }
}
