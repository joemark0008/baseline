import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { recordAccessChange, summarizeChange, type Snapshot } from '../access/access-change.js'
import {
  effectivePermissions,
  normalizeGrants,
  permissionKey,
  type Grant as GrantRow,
} from '../access/access-policy.js'
import type { PermissionAction } from '../access/actions.js'
import type { RoleKind } from '../access/role-kind.js'
import { PageArgs } from '../../common/pagination/page-args.js'
import { buildPageMeta, toPageQuery } from '../../common/pagination/paginate.js'
import { PrismaService, type PrismaTx } from '../../prisma/prisma.service.js'
import { AccessChangesPage } from './dto/access-changes-page.output.js'
import { Role } from './entities/role.entity.js'

interface RoleRow {
  id: string
  name: string
  description: string | null
  kind: RoleKind
  grants: GrantRow[]
}

const KIND_ORDER: Record<RoleKind, number> = { ADMIN: 0, MEMBER: 1, CUSTOM: 2 }

export interface RoleChanges {
  id: string
  name?: string | null
  description?: string | null
  grants?: GrantRow[] | null
}

/** Designs roles: their names, descriptions and grids. Every change is audited. */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin, Member, then custom roles by name. */
  async list(): Promise<Role[]> {
    const rows = await this.prisma.client.role.findMany({ include: { grants: true } })
    rows.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name))
    return Promise.all(rows.map((r) => this.toRole(r)))
  }

  async get(id: string): Promise<Role> {
    return this.toRole(await this.findRow(id))
  }

  async create(
    input: { name: string; description?: string | null; grants: GrantRow[] },
    actorId: string,
  ): Promise<Role> {
    const name = input.name.trim()
    const grants = normalizeGrants(input.grants)
    await this.assertNameFree(name)
    const id = await this.unique(() =>
      this.prisma.client.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: { name, nameKey: name.toLowerCase(), description: input.description ?? null },
        })
        await tx.roleGrant.createMany({ data: grants.map((g) => ({ roleId: role.id, ...g })) })
        await recordAccessChange(tx, {
          actorId,
          kind: 'ROLE_CREATED',
          roleId: role.id,
          after: snapshot({ ...role, grants }),
        })
        return role.id
      }),
    )
    return this.get(id)
  }

  async update(input: RoleChanges, actorId: string): Promise<Role> {
    const current = await this.findRow(input.id)
    const name = input.name?.trim() ?? current.name
    if (current.kind !== 'CUSTOM' && name !== current.name) {
      throw new BadRequestException("Built-in roles can't be renamed")
    }
    if (current.kind === 'ADMIN' && input.grants) {
      throw new BadRequestException("Built-in roles can't be limited: Admin has every permission")
    }
    if (name.toLowerCase() !== current.name.toLowerCase()) await this.assertNameFree(name)
    const grants = input.grants ? normalizeGrants(input.grants) : current.grants
    const description = input.description === undefined ? current.description : input.description
    await this.unique(() =>
      this.prisma.client.$transaction(async (tx) => {
        await tx.role.update({
          where: { id: current.id },
          data: { name, nameKey: name.toLowerCase(), description },
        })
        if (input.grants) await this.replaceGrants(tx, current.id, grants)
        await recordAccessChange(tx, {
          actorId,
          kind: 'ROLE_UPDATED',
          roleId: current.id,
          before: snapshot(current),
          after: snapshot({ ...current, name, description, grants }),
        })
      }),
    )
    return this.get(current.id)
  }

  /** Only unused custom roles can be deleted; spent (accepted or expired) invites go with them. */
  async delete(id: string, actorId: string): Promise<boolean> {
    const current = await this.findRow(id)
    if (current.kind !== 'CUSTOM') throw new BadRequestException("Built-in roles can't be deleted")
    const [people, invites] = await Promise.all([this.memberCount(current), this.pendingCount(id)])
    if (people > 0 || invites > 0) {
      throw new ConflictException(`This role is used by ${people} people and ${invites} invites`)
    }
    await this.prisma.client.$transaction(async (tx) => {
      await tx.invite.deleteMany({ where: { roleId: id } })
      await tx.role.delete({ where: { id } })
      await recordAccessChange(tx, {
        actorId,
        kind: 'ROLE_DELETED',
        roleId: id,
        before: snapshot(current),
      })
    })
    return true
  }

  /** The History page: newest first. */
  async accessChanges(pageArgs: PageArgs = {}): Promise<AccessChangesPage> {
    const { page, perPage, skip, take } = toPageQuery(pageArgs)
    const [rows, total] = await Promise.all([
      this.prisma.client.accessChange.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { actor: { select: { name: true } } },
      }),
      this.prisma.client.accessChange.count(),
    ])
    return {
      data: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        actorName: r.actor?.name ?? null,
        roleId: r.roleId,
        userId: r.userId,
        summary: summarizeChange(r.kind, r.before as Snapshot | null, r.after as Snapshot | null),
        createdAt: r.createdAt,
      })),
      meta: buildPageMeta(total, page, perPage),
    }
  }

  private async findRow(id: string): Promise<RoleRow> {
    const row = await this.prisma.client.role.findUnique({
      where: { id },
      include: { grants: true },
    })
    if (!row) throw new NotFoundException('Role not found')
    return row
  }

  private async assertNameFree(name: string): Promise<void> {
    const taken = await this.prisma.client.role.findUnique({
      where: { nameKey: name.toLowerCase() },
    })
    if (taken) throw new ConflictException('A role with this name exists')
  }

  /** A concurrent create can still hit the unique index; report it the same way. */
  private async unique<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run()
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('A role with this name exists')
      }
      throw err
    }
  }

  private async replaceGrants(tx: PrismaTx, roleId: string, grants: GrantRow[]): Promise<void> {
    await tx.roleGrant.deleteMany({ where: { roleId } })
    await tx.roleGrant.createMany({ data: grants.map((g) => ({ roleId, ...g })) })
  }

  /** Member also covers people who have no role row yet. */
  private async memberCount(role: RoleRow): Promise<number> {
    const assigned = await this.prisma.client.userAccess.count({ where: { roleId: role.id } })
    if (role.kind !== 'MEMBER') return assigned
    return assigned + (await this.prisma.client.user.count({ where: { access: null } }))
  }

  private pendingCount(roleId: string): Promise<number> {
    return this.prisma.client.invite.count({
      where: { roleId, acceptedAt: null, expiresAt: { gt: new Date() } },
    })
  }

  private async toRole(row: RoleRow): Promise<Role> {
    const [memberCount, pendingInviteCount] = await Promise.all([
      this.memberCount(row),
      this.pendingCount(row.id),
    ])
    const grants = [...effectivePermissions(row.kind, row.grants)].map((key) => {
      const [area, action] = key.split(':')
      return { area, action: action as PermissionAction }
    })
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      kind: row.kind,
      grants,
      memberCount,
      pendingInviteCount,
    }
  }
}

function snapshot(role: { name: string; description: string | null; grants: GrantRow[] }) {
  return {
    name: role.name,
    description: role.description,
    grants: role.grants.map((g) => permissionKey(g.area, g.action)),
  }
}
