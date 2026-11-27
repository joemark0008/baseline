import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common'
import { PageArgs } from '../../common/pagination/page-args.js'
import { buildPageMeta, toPageQuery } from '../../common/pagination/paginate.js'
import { PrismaService, type PrismaTx } from '../../prisma/prisma.service.js'
import { InvitesService } from '../invites/invites.service.js'
import { recordActivity } from './activity.js'
import { assertDateOrder, fromIsoDate, toIsoDate } from './dates.js'
import { ProjectActivity, ProjectActivityPage } from './entities/activity.entity.js'
import type { ProjectActivityKind, ProjectRole, ProjectStatus } from './entities/enums.js'
import { PersonSummary } from './entities/person-summary.entity.js'
import {
  Project,
  ProjectInvite,
  ProjectStakeholder,
  ProjectsPage,
} from './entities/project.entity.js'
import {
  PERSON,
  PROJECT_INCLUDE,
  toListItem,
  toPerson,
  toProject,
  type ProjectRow,
} from './mappers.js'
import { ProjectAccessService } from './project-access.service.js'

export const PROJECT_DATE_RULE = 'Target go-live must not be before the start date'
export const LAST_MANAGER = 'A project needs at least one Manager'

/** Implementation projects: lifecycle copy, membership, stakeholders and history (US1, US3, US5). */
@Injectable()
export class ProjectsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly invites: InvitesService,
  ) {}

  onModuleInit(): void {
    this.invites.setProjectJoin((tx, join) => this.joinFromInvite(tx, join))
  }

  /** FR-001, FR-002: creates the project from the template; the creator is its first Manager. */
  async create(
    input: {
      name: string
      hospitalName: string
      description?: string | null
      startDate?: string | null
      targetGoLiveDate?: string | null
    },
    actorId: string,
  ): Promise<Project> {
    assertDateOrder(input.startDate, input.targetGoLiveDate, PROJECT_DATE_RULE)
    const template = await this.prisma.client.templatePhase.findMany({
      orderBy: { order: 'asc' },
      include: { deliverables: { orderBy: { order: 'asc' } } },
    })
    const id = await this.prisma.client.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: input.name.trim(),
          hospitalName: input.hospitalName.trim(),
          description: input.description?.trim() || null,
          startDate: fromIsoDate(input.startDate),
          targetGoLiveDate: fromIsoDate(input.targetGoLiveDate),
          createdById: actorId,
          members: { create: { userId: actorId, role: 'MANAGER' } },
        },
      })
      for (const phase of template) {
        const created = await tx.projectPhase.create({
          data: {
            projectId: project.id,
            name: phase.name,
            description: phase.description,
            order: phase.order,
            templatePhaseId: phase.id,
          },
        })
        for (const d of phase.deliverables) {
          await tx.projectDeliverable.create({
            data: {
              projectId: project.id,
              phaseId: created.id,
              title: d.title,
              kind: d.kind,
              order: d.order,
              templateDeliverableId: d.id,
            },
          })
        }
      }
      await recordActivity(tx, {
        projectId: project.id,
        actorId,
        kind: 'PROJECT_CREATED',
        targetType: 'project',
        targetId: project.id,
        summary: `created the project from the standard template (${template.length} phases)`,
      })
      return project.id
    })
    return this.get(id, actorId)
  }

  /** Projects the caller belongs to, most recently updated first. */
  async listMine(userId: string, pageArgs: PageArgs = {}): Promise<ProjectsPage> {
    const { page, perPage, skip, take } = toPageQuery(pageArgs)
    const where = { members: { some: { userId } } }
    const [rows, total] = await Promise.all([
      this.prisma.client.project.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          members: { where: { userId }, select: { role: true } },
          phases: { select: { status: true } },
          tasks: { select: { status: true, dueDate: true } },
        },
      }),
      this.prisma.client.project.count({ where }),
    ])
    return { data: rows.map((r) => toListItem(r)), meta: buildPageMeta(total, page, perPage) }
  }

  async get(projectId: string, userId: string): Promise<Project> {
    const role = await this.access.assertMember(projectId, userId)
    const row = await this.prisma.client.project.findUnique({
      where: { id: projectId },
      include: PROJECT_INCLUDE(new Date()),
    })
    if (!row) throw new NotFoundException('Project not found')
    return toProject(row as unknown as ProjectRow, role)
  }

  async update(
    input: {
      id: string
      name?: string | null
      hospitalName?: string | null
      description?: string | null
      status?: ProjectStatus | null
      startDate?: string | null
      targetGoLiveDate?: string | null
    },
    actorId: string,
  ): Promise<Project> {
    await this.access.assertManager(input.id, actorId)
    const current = await this.prisma.client.project.findUnique({ where: { id: input.id } })
    if (!current) throw new NotFoundException('Project not found')
    const startDate = input.startDate !== undefined ? input.startDate : toIsoDate(current.startDate)
    const goLive =
      input.targetGoLiveDate !== undefined
        ? input.targetGoLiveDate
        : toIsoDate(current.targetGoLiveDate)
    assertDateOrder(startDate, goLive, PROJECT_DATE_RULE)
    await this.prisma.client.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: input.id },
        data: {
          ...(input.name != null ? { name: input.name.trim() } : {}),
          ...(input.hospitalName != null ? { hospitalName: input.hospitalName.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.startDate !== undefined ? { startDate: fromIsoDate(input.startDate) } : {}),
          ...(input.targetGoLiveDate !== undefined
            ? { targetGoLiveDate: fromIsoDate(input.targetGoLiveDate) }
            : {}),
        },
      })
      await recordActivity(tx, {
        projectId: input.id,
        actorId,
        kind: 'PROJECT_UPDATED',
        targetType: 'project',
        targetId: input.id,
        summary: 'updated the project details',
        details: { fields: Object.keys(input).filter((k) => k !== 'id') },
      })
    })
    return this.get(input.id, actorId)
  }

  // ---- members (FR-011, FR-011a) ----

  async addMember(
    projectId: string,
    userId: string,
    role: ProjectRole,
    actorId: string,
  ): Promise<Project> {
    await this.access.assertManager(projectId, actorId)
    const person = await this.prisma.client.user.findUnique({ where: { id: userId } })
    if (!person || person.banned) throw new NotFoundException('User not found or deactivated')
    const existing = await this.access.membershipFor(projectId, userId)
    if (existing) throw new ConflictException(`${person.name} is already a member`)
    await this.prisma.client.$transaction(async (tx) => {
      await tx.projectMember.create({ data: { projectId, userId, role } })
      await recordActivity(tx, {
        projectId,
        actorId,
        kind: 'MEMBER_ADDED',
        targetType: 'member',
        targetId: userId,
        summary: `added ${person.name} as ${roleLabel(role)}`,
      })
    })
    return this.get(projectId, actorId)
  }

  /** An existing active account joins directly; anyone else gets an email invite (clarification Q2). */
  async inviteMember(
    input: { projectId: string; email: string; role: ProjectRole },
    actorId: string,
  ): Promise<{ invite: ProjectInvite | null; joinedUserId: string | null; emailSent: boolean }> {
    await this.access.assertManager(input.projectId, actorId)
    const email = input.email.trim().toLowerCase()
    const existing = await this.prisma.client.user.findFirst({
      where: { email, banned: { not: true } },
    })
    if (existing) {
      await this.addMember(input.projectId, existing.id, input.role, actorId)
      return { invite: null, joinedUserId: existing.id, emailSent: false }
    }
    const project = await this.prisma.client.project.findUnique({ where: { id: input.projectId } })
    if (!project) throw new NotFoundException('Project not found')
    const { invite, emailSent } = await this.invites.inviteUser({
      email,
      invitedById: actorId,
      project: {
        id: project.id,
        role: input.role,
        name: project.name,
        hospitalName: project.hospitalName,
      },
    })
    await this.prisma.client.$transaction((tx) =>
      recordActivity(tx, {
        projectId: input.projectId,
        actorId,
        kind: 'MEMBER_INVITED',
        targetType: 'invite',
        targetId: invite.id,
        summary: `invited ${email} as ${roleLabel(input.role)}`,
      }),
    )
    return {
      invite: { id: invite.id, email: invite.email, role: input.role, expiresAt: invite.expiresAt },
      joinedUserId: null,
      emailSent,
    }
  }

  async setMemberRole(
    projectId: string,
    userId: string,
    role: ProjectRole,
    actorId: string,
  ): Promise<Project> {
    await this.access.assertManager(projectId, actorId)
    const current = await this.access.membershipFor(projectId, userId)
    if (!current) throw new NotFoundException('Not a member of this project')
    if (current === 'MANAGER' && role !== 'MANAGER')
      await this.assertAnotherManager(projectId, userId)
    const person = await this.prisma.client.user.findUnique({ where: { id: userId } })
    await this.prisma.client.$transaction(async (tx) => {
      await tx.projectMember.update({
        where: { projectId_userId: { projectId, userId } },
        data: { role },
      })
      await recordActivity(tx, {
        projectId,
        actorId,
        kind: 'MEMBER_ROLE_CHANGED',
        targetType: 'member',
        targetId: userId,
        summary: `made ${person?.name ?? userId} a ${roleLabel(role)}`,
      })
    })
    return this.get(projectId, actorId)
  }

  async removeMember(projectId: string, userId: string, actorId: string): Promise<Project> {
    await this.access.assertManager(projectId, actorId)
    const current = await this.access.membershipFor(projectId, userId)
    if (!current) throw new NotFoundException('Not a member of this project')
    if (current === 'MANAGER') await this.assertAnotherManager(projectId, userId)
    const person = await this.prisma.client.user.findUnique({ where: { id: userId } })
    await this.prisma.client.$transaction(async (tx) => {
      await tx.projectMember.delete({ where: { projectId_userId: { projectId, userId } } })
      await recordActivity(tx, {
        projectId,
        actorId,
        kind: 'MEMBER_REMOVED',
        targetType: 'member',
        targetId: userId,
        summary: `removed ${person?.name ?? userId} from the project`,
      })
    })
    return this.get(projectId, actorId)
  }

  /** Active accounts that are not members yet, by name or email; for the Add member dialog. */
  async memberCandidates(
    projectId: string,
    search: string,
    actorId: string,
  ): Promise<PersonSummary[]> {
    await this.access.assertManager(projectId, actorId)
    const q = search.trim()
    const rows = await this.prisma.client.user.findMany({
      where: {
        banned: { not: true },
        projectMemberships: { none: { projectId } },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 20,
      ...PERSON,
    })
    return rows.map(toPerson)
  }

  /** Called from InvitesService.accept inside its transaction. Idempotent. */
  async joinFromInvite(
    tx: PrismaTx,
    join: { projectId: string; userId: string; role: 'MANAGER' | 'MEMBER' },
  ): Promise<void> {
    const existing = await tx.projectMember.findUnique({
      where: { projectId_userId: { projectId: join.projectId, userId: join.userId } },
    })
    if (existing) return
    const person = await tx.user.findUnique({ where: { id: join.userId } })
    await tx.projectMember.create({
      data: { projectId: join.projectId, userId: join.userId, role: join.role },
    })
    await recordActivity(tx, {
      projectId: join.projectId,
      actorId: join.userId,
      kind: 'MEMBER_ADDED',
      targetType: 'member',
      targetId: join.userId,
      summary: `${person?.name ?? 'A new member'} joined as ${roleLabel(join.role)} by invitation`,
    })
  }

  // ---- stakeholders (FR-018) ----

  async addStakeholder(
    input: {
      projectId: string
      name: string
      organization: string
      role: string
      email?: string | null
      phone?: string | null
      userId?: string | null
      notes?: string | null
    },
    actorId: string,
  ): Promise<ProjectStakeholder> {
    await this.access.assertManager(input.projectId, actorId)
    const row = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.projectStakeholder.create({
        data: {
          projectId: input.projectId,
          name: input.name.trim(),
          organization: input.organization.trim(),
          role: input.role.trim(),
          email: input.email?.trim().toLowerCase() || null,
          phone: input.phone?.trim() || null,
          userId: input.userId || null,
          notes: input.notes?.trim() || null,
        },
        include: { user: PERSON },
      })
      await recordActivity(tx, {
        projectId: input.projectId,
        actorId,
        kind: 'STAKEHOLDER_ADDED',
        targetType: 'stakeholder',
        targetId: created.id,
        summary: `added stakeholder ${created.name} (${created.organization})`,
      })
      return created
    })
    return this.toStakeholder(row)
  }

  async updateStakeholder(
    input: {
      id: string
      name?: string | null
      organization?: string | null
      role?: string | null
      email?: string | null
      phone?: string | null
      userId?: string | null
      notes?: string | null
    },
    actorId: string,
  ): Promise<ProjectStakeholder> {
    const current = await this.prisma.client.projectStakeholder.findUnique({
      where: { id: input.id },
    })
    if (!current) throw new NotFoundException('Stakeholder not found')
    await this.access.assertManager(current.projectId, actorId)
    const row = await this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.projectStakeholder.update({
        where: { id: input.id },
        data: {
          ...(input.name != null ? { name: input.name.trim() } : {}),
          ...(input.organization != null ? { organization: input.organization.trim() } : {}),
          ...(input.role != null ? { role: input.role.trim() } : {}),
          ...(input.email !== undefined
            ? { email: input.email?.trim().toLowerCase() || null }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
          ...(input.userId !== undefined ? { userId: input.userId || null } : {}),
          ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        },
        include: { user: PERSON },
      })
      await recordActivity(tx, {
        projectId: current.projectId,
        actorId,
        kind: 'STAKEHOLDER_UPDATED',
        targetType: 'stakeholder',
        targetId: input.id,
        summary: `updated stakeholder ${updated.name}`,
      })
      return updated
    })
    return this.toStakeholder(row)
  }

  async removeStakeholder(id: string, actorId: string): Promise<boolean> {
    const current = await this.prisma.client.projectStakeholder.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Stakeholder not found')
    await this.access.assertManager(current.projectId, actorId)
    await this.prisma.client.$transaction(async (tx) => {
      await tx.projectStakeholder.delete({ where: { id } })
      await recordActivity(tx, {
        projectId: current.projectId,
        actorId,
        kind: 'STAKEHOLDER_REMOVED',
        targetType: 'stakeholder',
        targetId: id,
        summary: `removed stakeholder ${current.name}`,
      })
    })
    return true
  }

  // ---- activity (FR-013) ----

  async activity(
    projectId: string,
    userId: string,
    pageArgs: PageArgs = {},
  ): Promise<ProjectActivityPage> {
    await this.access.assertMember(projectId, userId)
    const { page, perPage, skip, take } = toPageQuery(pageArgs)
    const [rows, total] = await Promise.all([
      this.prisma.client.projectActivity.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { actor: PERSON },
      }),
      this.prisma.client.projectActivity.count({ where: { projectId } }),
    ])
    const data: ProjectActivity[] = rows.map((r) => ({
      id: r.id,
      actor: r.actor ? toPerson(r.actor) : null,
      kind: r.kind as ProjectActivityKind,
      summary: r.summary,
      targetType: r.targetType,
      targetId: r.targetId,
      createdAt: r.createdAt,
    }))
    return { data, meta: buildPageMeta(total, page, perPage) }
  }

  private async assertAnotherManager(projectId: string, exceptUserId: string): Promise<void> {
    const managers = await this.prisma.client.projectMember.count({
      where: { projectId, role: 'MANAGER', userId: { not: exceptUserId } },
    })
    if (managers === 0) throw new BadRequestException(LAST_MANAGER)
  }

  private toStakeholder(row: {
    id: string
    name: string
    organization: string
    role: string
    email: string | null
    phone: string | null
    notes: string | null
    user: { id: string; name: string; email: string; image: string | null } | null
  }): ProjectStakeholder {
    return {
      id: row.id,
      name: row.name,
      organization: row.organization,
      role: row.role,
      email: row.email,
      phone: row.phone,
      user: row.user ? toPerson(row.user) : null,
      notes: row.notes,
    }
  }
}

export function roleLabel(role: ProjectRole | string): string {
  return role === 'MANAGER' ? 'Manager' : 'Member'
}
