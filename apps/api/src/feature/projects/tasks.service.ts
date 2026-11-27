import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { APP_ENV, type AppEnv } from '../../config/env.js'
import { EmailService } from '../../email/email.service.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { recordActivity } from './activity.js'
import { assertDateOrder, fromIsoDate, toIsoDate, todayIso } from './dates.js'
import type { TaskPriority, TaskStatus } from './entities/enums.js'
import { ProjectTask, TaskComment } from './entities/project.entity.js'
import { PERSON, toComment, toTask, type TaskRow } from './mappers.js'
import { ProjectAccessService } from './project-access.service.js'

export const TASK_DATE_RULE = 'Due date must not be before start date'
export const SELF_DEPENDENCY = 'A task cannot depend on itself'
export const CYCLE = 'This dependency would create a cycle'
export const PREDECESSOR_PROJECT = 'The predecessor must belong to the same project'
export const PHASE_PROJECT = 'The phase must belong to the same project'
export const OWNER_MEMBER = 'The owner must be a member of the project'
export const MENTION_MEMBER = 'You can only mention members of the project'

const TASK_INCLUDE = {
  owner: PERSON,
  predecessor: { select: { id: true, title: true } },
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
      orderBy: [{ dueDate: 'asc' }, { title: 'asc' }],
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
    const url = new URL(`/projects/${projectId}/tasks`, this.env.webOrigins[0])
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
