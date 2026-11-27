import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { APP_ENV, type AppEnv } from '../../config/env.js'
import { EmailService } from '../../email/email.service.js'
import { PrismaService, type PrismaTx } from '../../prisma/prisma.service.js'
import { recordActivity } from './activity.js'
import { completionStamp } from './completion.js'
import { assertDateOrder, fromIsoDate, toIsoDate, todayIso } from './dates.js'
import type { TaskPriority, TaskSort, TaskStatus } from './entities/enums.js'
import { ProjectTask, TaskComment } from './entities/project.entity.js'
import { PERSON, PREDECESSOR, toComment, toTask, type TaskRow } from './mappers.js'
import { ProjectAccessService } from './project-access.service.js'

export const TASK_DATE_RULE = 'Due date must not be before start date'
export const SELF_DEPENDENCY = 'A task cannot depend on itself'
export const CYCLE = 'This dependency would create a cycle'
export const PREDECESSOR_PROJECT = 'The predecessor must belong to the same project'
export const PHASE_PROJECT = 'The phase must belong to the same project'
export const OWNER_MEMBER = 'The owner must be a member of the project'
export const MENTION_MEMBER = 'You can only mention members of the project'
export const TASK_PROJECT = 'Task not found in this project'
export const PHASE_NOT_IN_PROJECT = 'Phase not found in this project'
/** Below this gap between neighbours the project is renumbered 1..n before placing. */
export const MIN_GAP = 1e-6

const TASK_INCLUDE = {
  owner: PERSON,
  predecessor: PREDECESSOR,
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: PERSON, mentions: { include: { user: PERSON } } },
  },
}

/** Tasks, dependencies, comments and mentions (US2, US3). Members do all of this. */
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly email: EmailService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async list(
    filter: {
      projectId: string
      phaseId?: string | null
      ownerId?: string | null
      status?: TaskStatus | null
      overdue?: boolean | null
      sort?: TaskSort | null
    },
    userId: string,
  ): Promise<ProjectTask[]> {
    await this.access.assertMember(filter.projectId, userId)
    const rows = await this.prisma.client.projectTask.findMany({
      where: {
        projectId: filter.projectId,
        ...(filter.phaseId ? { phaseId: filter.phaseId } : {}),
        ...(filter.ownerId ? { ownerId: filter.ownerId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy:
        filter.sort === 'DUE_DATE'
          ? [{ dueDate: 'asc' }, { title: 'asc' }]
          : [{ position: 'asc' }, { createdAt: 'asc' }],
      include: TASK_INCLUDE,
    })
    const today = todayIso()
    const tasks = rows.map((r) => toTask(r as unknown as TaskRow, today))
    return filter.overdue ? tasks.filter((t) => t.overdue) : tasks
  }

  async get(id: string, userId: string): Promise<ProjectTask> {
    const row = await this.find(id)
    await this.access.assertMember(row.projectId, userId)
    return toTask(row as unknown as TaskRow)
  }

  async create(
    input: {
      projectId: string
      phaseId: string
      title: string
      description?: string | null
      ownerId?: string | null
      status?: TaskStatus | null
      priority?: TaskPriority | null
      startDate?: string | null
      dueDate?: string | null
      predecessorId?: string | null
    },
    actorId: string,
  ): Promise<ProjectTask> {
    await this.access.assertMember(input.projectId, actorId)
    await this.assertPhaseInProject(input.phaseId, input.projectId)
    assertDateOrder(input.startDate, input.dueDate, TASK_DATE_RULE)
    if (input.ownerId) await this.assertOwner(input.projectId, input.ownerId)
    if (input.predecessorId)
      await this.assertPredecessor(input.projectId, input.predecessorId, null)
    const row = await this.prisma.client.$transaction(async (tx) => {
      const last = await tx.projectTask.findFirst({
        where: { projectId: input.projectId },
        orderBy: { position: 'desc' },
      })
      const created = await tx.projectTask.create({
        data: {
          projectId: input.projectId,
          phaseId: input.phaseId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          ownerId: input.ownerId || null,
          status: input.status ?? 'UPCOMING',
          priority: input.priority ?? 'MEDIUM',
          startDate: fromIsoDate(input.startDate),
          dueDate: fromIsoDate(input.dueDate),
          predecessorId: input.predecessorId || null,
          position: (last?.position ?? 0) + 1,
          ...completionStamp(null, input.status ?? 'UPCOMING'),
          createdById: actorId,
        },
        include: TASK_INCLUDE,
      })
      await recordActivity(tx, {
        projectId: input.projectId,
        actorId,
        kind: 'TASK_CREATED',
        targetType: 'task',
        targetId: created.id,
        summary: `created task ${created.title}`,
      })
      return created
    })
    const task = toTask(row as unknown as TaskRow)
    if (task.owner && task.owner.id !== actorId) await this.notifyAssigned(task, actorId)
    return task
  }

  async update(
    input: {
      id: string
      phaseId?: string | null
      title?: string | null
      description?: string | null
      ownerId?: string | null
      status?: TaskStatus | null
      priority?: TaskPriority | null
      startDate?: string | null
      dueDate?: string | null
      predecessorId?: string | null
    },
    actorId: string,
  ): Promise<ProjectTask> {
    const current = await this.find(input.id)
    await this.access.assertMember(current.projectId, actorId)
    if (input.phaseId) await this.assertPhaseInProject(input.phaseId, current.projectId)
    const startDate = input.startDate !== undefined ? input.startDate : toIsoDate(current.startDate)
    const dueDate = input.dueDate !== undefined ? input.dueDate : toIsoDate(current.dueDate)
    assertDateOrder(startDate, dueDate, TASK_DATE_RULE)
    if (input.ownerId) await this.assertOwner(current.projectId, input.ownerId)
    if (input.predecessorId)
      await this.assertPredecessor(current.projectId, input.predecessorId, current.id)
    const row = await this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.projectTask.update({
        where: { id: input.id },
        data: {
          ...(input.phaseId ? { phaseId: input.phaseId } : {}),
          ...(input.title != null ? { title: input.title.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          ...(input.ownerId !== undefined ? { ownerId: input.ownerId || null } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.status ? completionStamp(current.status, input.status) : {}),
          ...(input.priority ? { priority: input.priority } : {}),
          ...(input.startDate !== undefined ? { startDate: fromIsoDate(input.startDate) } : {}),
          ...(input.dueDate !== undefined ? { dueDate: fromIsoDate(input.dueDate) } : {}),
          ...(input.predecessorId !== undefined
            ? { predecessorId: input.predecessorId || null }
            : {}),
        },
        include: TASK_INCLUDE,
      })
      await recordActivity(tx, {
        projectId: current.projectId,
        actorId,
        kind: 'TASK_UPDATED',
        targetType: 'task',
        targetId: input.id,
        summary: describeTaskChange(current, input),
        details: {
          fields: Object.keys(input).filter(
            (k) => k !== 'id' && input[k as keyof typeof input] !== undefined,
          ),
        },
      })
      return updated
    })
    const task = toTask(row as unknown as TaskRow)
    const ownerChanged = input.ownerId !== undefined && input.ownerId !== current.ownerId
    if (ownerChanged && task.owner && task.owner.id !== actorId)
      await this.notifyAssigned(task, actorId)
    return task
  }

  /**
   * Feature 010 FR-005/FR-006/FR-013: a drag-and-drop move. Places the task between the named
   * neighbours (midpoint; renumbers the project when the gap vanishes), and/or changes status or
   * phase. Nothing is written, and no activity recorded, when nothing would change.
   */
  async move(
    input: {
      id: string
      status?: TaskStatus | null
      phaseId?: string | null
      afterTaskId?: string | null
      beforeTaskId?: string | null
    },
    actorId: string,
  ): Promise<ProjectTask> {
    const current = await this.find(input.id)
    await this.access.assertMember(current.projectId, actorId)
    const phase = input.phaseId ? await this.phaseIn(input.phaseId, current.projectId) : null
    const row = await this.prisma.client.$transaction(async (tx) => {
      const position = await this.placeBetween(tx, current, input.afterTaskId, input.beforeTaskId)
      const status = input.status ?? current.status
      const phaseId = phase?.id ?? current.phaseId
      const changes: string[] = []
      if (status !== current.status)
        changes.push(`moved task ${current.title} to ${status.toLowerCase().replace('_', ' ')}`)
      if (phaseId !== current.phaseId)
        changes.push(`moved task ${current.title} to phase ${phase?.name}`)
      if (position !== current.position) changes.push(`reordered task ${current.title}`)
      if (changes.length === 0) return null
      const updated = await tx.projectTask.update({
        where: { id: current.id },
        data: { status, phaseId, position, ...completionStamp(current.status, status) },
        include: TASK_INCLUDE,
      })
      await recordActivity(tx, {
        projectId: current.projectId,
        actorId,
        kind: 'TASK_UPDATED',
        targetType: 'task',
        targetId: current.id,
        summary: changes.join(', '),
        details: { move: true },
      })
      return updated
    })
    return toTask((row ?? current) as unknown as TaskRow)
  }

  /** The slot between `after` and `before`; keeps the current position when already inside it. */
  private async placeBetween(
    tx: PrismaTx,
    current: { id: string; projectId: string; position: number },
    afterTaskId: string | null | undefined,
    beforeTaskId: string | null | undefined,
  ): Promise<number> {
    if (!afterTaskId && !beforeTaskId) return current.position
    let bounds = await this.slotBounds(tx, current, afterTaskId, beforeTaskId)
    if (bounds.lo < current.position && current.position < bounds.hi) return current.position
    if (
      Number.isFinite(bounds.lo) &&
      Number.isFinite(bounds.hi) &&
      bounds.hi - bounds.lo < MIN_GAP
    ) {
      await this.renumber(tx, current.projectId)
      bounds = await this.slotBounds(tx, current, afterTaskId, beforeTaskId)
    }
    if (!Number.isFinite(bounds.lo) && !Number.isFinite(bounds.hi)) return current.position
    if (!Number.isFinite(bounds.hi)) return bounds.lo + 1
    if (!Number.isFinite(bounds.lo)) return bounds.hi - 1
    return (bounds.lo + bounds.hi) / 2
  }

  /** Positions of the neighbours around the target slot, ignoring the moving task itself. */
  private async slotBounds(
    tx: PrismaTx,
    current: { id: string; projectId: string },
    afterTaskId: string | null | undefined,
    beforeTaskId: string | null | undefined,
  ): Promise<{ lo: number; hi: number }> {
    const after = afterTaskId ? await this.neighbour(tx, afterTaskId, current.projectId) : null
    const before = beforeTaskId ? await this.neighbour(tx, beforeTaskId, current.projectId) : null
    const others = { projectId: current.projectId, id: { not: current.id } }
    const lo =
      after?.position ??
      (before
        ? (
            await tx.projectTask.findFirst({
              where: { ...others, position: { lt: before.position } },
              orderBy: { position: 'desc' },
            })
          )?.position
        : undefined) ??
      -Infinity
    const hi =
      before?.position ??
      (after
        ? (
            await tx.projectTask.findFirst({
              where: { ...others, position: { gt: after.position } },
              orderBy: { position: 'asc' },
            })
          )?.position
        : undefined) ??
      Infinity
    return { lo, hi }
  }

  private async neighbour(tx: PrismaTx, id: string, projectId: string) {
    const row = await tx.projectTask.findUnique({ where: { id } })
    if (!row || row.projectId !== projectId) throw new BadRequestException(TASK_PROJECT)
    return row
  }

  /** Positions 1..n in the current order; only when midpoints have run out of precision. */
  private async renumber(tx: PrismaTx, projectId: string): Promise<void> {
    const rows = await tx.projectTask.findMany({
      where: { projectId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    })
    for (const [i, row] of rows.entries()) {
      await tx.projectTask.update({ where: { id: row.id }, data: { position: i + 1 } })
    }
  }

  private async phaseIn(phaseId: string, projectId: string) {
    const phase = await this.prisma.client.projectPhase.findUnique({ where: { id: phaseId } })
    if (!phase || phase.projectId !== projectId) throw new BadRequestException(PHASE_NOT_IN_PROJECT)
    return phase
  }

  async delete(id: string, actorId: string): Promise<boolean> {
    const current = await this.find(id)
    await this.access.assertMember(current.projectId, actorId)
    await this.prisma.client.$transaction(async (tx) => {
      await tx.projectTask.delete({ where: { id } })
      await recordActivity(tx, {
        projectId: current.projectId,
        actorId,
        kind: 'TASK_DELETED',
        targetType: 'task',
        targetId: id,
        summary: `deleted task ${current.title}`,
      })
    })
    return true
  }

  /** FR-012, FR-012a: a comment on a task; @mentions must be members and are emailed. */
  async addComment(
    input: { taskId: string; body: string; mentionUserIds?: string[] | null },
    actorId: string,
  ): Promise<TaskComment> {
    const task = await this.find(input.taskId)
    await this.access.assertMember(task.projectId, actorId)
    const mentionIds = [...new Set((input.mentionUserIds ?? []).filter((id) => id !== actorId))]
    for (const id of mentionIds) {
      if (!(await this.access.membershipFor(task.projectId, id)))
        throw new BadRequestException(MENTION_MEMBER)
    }
    const row = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.taskComment.create({
        data: {
          taskId: input.taskId,
          authorId: actorId,
          body: input.body.trim(),
          mentions: { create: mentionIds.map((userId) => ({ userId })) },
        },
        include: { author: PERSON, mentions: { include: { user: PERSON } } },
      })
      await recordActivity(tx, {
        projectId: task.projectId,
        actorId,
        kind: 'COMMENT_ADDED',
        targetType: 'task',
        targetId: task.id,
        summary: `commented on ${task.title}`,
      })
      return created
    })
    const comment = toComment(row)
    if (comment.mentions.length) {
      const project = await this.prisma.client.project.findUnique({ where: { id: task.projectId } })
      await Promise.all(
        comment.mentions.map((person) =>
          this.email.sendMention({
            to: person.email,
            commentId: comment.id,
            projectName: project?.name ?? 'the project',
            taskTitle: task.title,
            author: comment.author.name,
            excerpt: comment.body.slice(0, 280),
            taskUrl: this.taskUrl(task.projectId, task.id),
          }),
        ),
      )
    }
    return comment
  }

  private async notifyAssigned(task: ProjectTask, actorId: string): Promise<void> {
    if (!task.owner) return
    const [project, actor] = await Promise.all([
      this.prisma.client.project.findUnique({ where: { id: task.projectId } }),
      this.prisma.client.user.findUnique({ where: { id: actorId } }),
    ])
    await this.email.sendTaskAssigned({
      to: task.owner.email,
      taskId: task.id,
      projectName: project?.name ?? 'the project',
      taskTitle: task.title,
      assignedBy: actor?.name ?? 'A project member',
      dueDate: task.dueDate,
      taskUrl: this.taskUrl(task.projectId, task.id),
    })
  }

  private taskUrl(projectId: string, taskId: string): string {
    const url = new URL(`/projects/${projectId}/list`, this.env.webOrigins[0])
    url.searchParams.set('task', taskId)
    return url.toString()
  }

  private async find(id: string) {
    const row = await this.prisma.client.projectTask.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    })
    if (!row) throw new NotFoundException('Task not found')
    return row
  }

  private async assertPhaseInProject(phaseId: string, projectId: string): Promise<void> {
    const phase = await this.prisma.client.projectPhase.findUnique({ where: { id: phaseId } })
    if (!phase || phase.projectId !== projectId) throw new BadRequestException(PHASE_PROJECT)
  }

  private async assertOwner(projectId: string, ownerId: string): Promise<void> {
    if (!(await this.access.membershipFor(projectId, ownerId)))
      throw new BadRequestException(OWNER_MEMBER)
  }

  /** FR-009: same project, not itself, and no cycle through the predecessor chain. */
  private async assertPredecessor(
    projectId: string,
    predecessorId: string,
    taskId: string | null,
  ): Promise<void> {
    if (taskId && predecessorId === taskId) throw new BadRequestException(SELF_DEPENDENCY)
    const first = await this.prisma.client.projectTask.findUnique({ where: { id: predecessorId } })
    if (!first || first.projectId !== projectId) throw new BadRequestException(PREDECESSOR_PROJECT)
    if (!taskId) return
    let cursor: string | null = first.predecessorId
    const seen = new Set<string>([predecessorId])
    for (let hops = 0; cursor && hops < 1000; hops++) {
      if (cursor === taskId) throw new BadRequestException(CYCLE)
      if (seen.has(cursor)) break
      seen.add(cursor)
      const next = await this.prisma.client.projectTask.findUnique({ where: { id: cursor } })
      cursor = next?.predecessorId ?? null
    }
  }
}

function describeTaskChange(
  current: { title: string; status: string; ownerId: string | null },
  input: { title?: string | null; status?: string | null; ownerId?: string | null },
): string {
  if (input.status && input.status !== current.status) {
    return `moved task ${current.title} to ${input.status.toLowerCase().replace('_', ' ')}`
  }
  if (input.ownerId !== undefined && input.ownerId !== current.ownerId) {
    return input.ownerId ? `reassigned task ${current.title}` : `unassigned task ${current.title}`
  }
  if (input.title && input.title !== current.title)
    return `renamed task ${current.title} to ${input.title}`
  return `updated task ${current.title}`
}
