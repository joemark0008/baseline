import { isOverdue, toIsoDate } from './dates.js'
import type {
  DeliverableKind,
  DeliverableStatus,
  PhaseStatus,
  ProjectRole,
  ProjectStatus,
  ReviewOutcome,
  TaskPriority,
  TaskStatus,
} from './entities/enums.js'
import type { PersonSummary } from './entities/person-summary.entity.js'
import type {
  DeliverableLink,
  Project,
  ProjectDeliverable,
  ProjectListItem,
  ProjectPhase,
  ProjectSummary,
  ProjectTask,
  TaskComment,
} from './entities/project.entity.js'

/** The Prisma `select` for a person wherever one is embedded. */
export const PERSON = { select: { id: true, name: true, email: true, image: true } }

/** The Prisma `select` for a task's predecessor: its due date feeds `predecessorConflict`. */
export const PREDECESSOR = { select: { id: true, title: true, dueDate: true } }

export type PersonRow = { id: string; name: string; email: string; image: string | null }

export interface TaskRow {
  id: string
  projectId: string
  phaseId: string
  title: string
  description: string | null
  owner: PersonRow | null
  status: string
  priority: string
  startDate: Date | null
  dueDate: Date | null
  predecessor: { id: string; title: string; dueDate?: Date | null } | null
  position?: number
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  comments?: CommentRow[]
}

export interface CommentRow {
  id: string
  author: PersonRow
  body: string
  createdAt: Date
  mentions: { user: PersonRow }[]
}

export interface DeliverableRow {
  id: string
  phaseId: string
  title: string
  kind: string
  owner: PersonRow | null
  reviewer: PersonRow | null
  dueDate: Date | null
  status: string
  reviewOutcome: string | null
  reviewNote: string | null
  reviewedAt: Date | null
  links: unknown
  order: number
}

export interface PhaseRow {
  id: string
  name: string
  description: string | null
  order: number
  owner: PersonRow | null
  startDate: Date | null
  endDate: Date | null
  status: string
  tasks: TaskRow[]
  deliverables: DeliverableRow[]
}

export interface ProjectRow {
  id: string
  name: string
  hospitalName: string
  description: string | null
  status: string
  startDate: Date | null
  targetGoLiveDate: Date | null
  createdAt: Date
  updatedAt: Date
  phases: PhaseRow[]
  members: { user: PersonRow; role: string; addedAt: Date }[]
  stakeholders: {
    id: string
    name: string
    organization: string
    role: string
    email: string | null
    phone: string | null
    user: PersonRow | null
    notes: string | null
  }[]
  invites?: { id: string; email: string; projectRole: string | null; expiresAt: Date }[]
}

export const toPerson = (row: PersonRow): PersonSummary => ({
  id: row.id,
  name: row.name,
  email: row.email,
  image: row.image,
})

export function toLinks(value: unknown): DeliverableLink[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (v): v is { label: string; url: string } =>
        typeof v?.label === 'string' && typeof v?.url === 'string',
    )
    .map((v) => ({ label: v.label, url: v.url }))
}

export function toComment(row: CommentRow): TaskComment {
  return {
    id: row.id,
    author: toPerson(row.author),
    body: row.body,
    mentions: row.mentions.map((m) => toPerson(m.user)),
    createdAt: row.createdAt,
  }
}

/** Feature 010 FR-019: starts before its predecessor is due. A warning, never a refusal. */
export function predecessorConflict(row: {
  startDate: Date | null
  predecessor: { dueDate?: Date | null } | null
}): boolean {
  const start = toIsoDate(row.startDate)
  const predecessorDue = toIsoDate(row.predecessor?.dueDate)
  return start !== null && predecessorDue !== null && start < predecessorDue
}

export function toTask(row: TaskRow, today?: string): ProjectTask {
  const dueDate = toIsoDate(row.dueDate)
  return {
    id: row.id,
    projectId: row.projectId,
    phaseId: row.phaseId,
    title: row.title,
    description: row.description,
    owner: row.owner ? toPerson(row.owner) : null,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    startDate: toIsoDate(row.startDate),
    dueDate,
    overdue: isOverdue(dueDate, row.status, today),
    predecessor: row.predecessor ? { id: row.predecessor.id, title: row.predecessor.title } : null,
    position: row.position ?? 0,
    predecessorConflict: predecessorConflict(row),
    completedAt: row.completedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    comments: (row.comments ?? []).map(toComment),
  }
}

export function toDeliverable(row: DeliverableRow): ProjectDeliverable {
  return {
    id: row.id,
    phaseId: row.phaseId,
    title: row.title,
    kind: row.kind as DeliverableKind,
    owner: row.owner ? toPerson(row.owner) : null,
    reviewer: row.reviewer ? toPerson(row.reviewer) : null,
    dueDate: toIsoDate(row.dueDate),
    status: row.status as DeliverableStatus,
    reviewOutcome: (row.reviewOutcome as ReviewOutcome | null) ?? null,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt,
    links: toLinks(row.links),
    order: row.order,
  }
}

export function toPhase(row: PhaseRow, today?: string): ProjectPhase {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    order: row.order,
    owner: row.owner ? toPerson(row.owner) : null,
    startDate: toIsoDate(row.startDate),
    endDate: toIsoDate(row.endDate),
    status: row.status as PhaseStatus,
    tasks: row.tasks.map((t) => toTask(t, today)),
    deliverables: row.deliverables.map(toDeliverable),
  }
}

export function summarize(
  phases: { status: string }[],
  tasks: { status: string; dueDate: Date | null }[],
  today?: string,
): ProjectSummary {
  const completePhases = phases.filter((p) => p.status === 'COMPLETE').length
  const openTasks = tasks.filter((t) => t.status !== 'COMPLETE').length
  const overdueTasks = tasks.filter((t) => isOverdue(toIsoDate(t.dueDate), t.status, today)).length
  return {
    totalTasks: tasks.length,
    openTasks,
    overdueTasks,
    phaseCount: phases.length,
    completePhases,
    progress: phases.length ? Math.round((completePhases / phases.length) * 100) : 0,
  }
}

export function toProject(
  row: ProjectRow,
  role: ProjectRole | 'MANAGER' | 'MEMBER',
  today?: string,
): Project {
  const myRole = role as ProjectRole
  const phases = row.phases.map((p) => toPhase(p, today))
  const tasks = row.phases.flatMap((p) => p.tasks)
  return {
    id: row.id,
    name: row.name,
    hospitalName: row.hospitalName,
    description: row.description,
    status: row.status as ProjectStatus,
    startDate: toIsoDate(row.startDate),
    targetGoLiveDate: toIsoDate(row.targetGoLiveDate),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    myRole,
    can: { manage: myRole === 'MANAGER', edit: true },
    summary: summarize(row.phases, tasks, today),
    phases,
    members: row.members.map((m) => ({
      user: toPerson(m.user),
      role: m.role as ProjectRole,
      addedAt: m.addedAt,
    })),
    stakeholders: row.stakeholders.map((s) => ({
      id: s.id,
      name: s.name,
      organization: s.organization,
      role: s.role,
      email: s.email,
      phone: s.phone,
      user: s.user ? toPerson(s.user) : null,
      notes: s.notes,
    })),
    pendingInvites:
      myRole === 'MANAGER'
        ? (row.invites ?? []).map((i) => ({
            id: i.id,
            email: i.email,
            role: (i.projectRole ?? 'MEMBER') as ProjectRole,
            expiresAt: i.expiresAt,
          }))
        : [],
  }
}

export function toListItem(
  row: {
    id: string
    name: string
    hospitalName: string
    status: string
    startDate: Date | null
    targetGoLiveDate: Date | null
    updatedAt: Date
    phases: { status: string }[]
    tasks: { status: string; dueDate: Date | null }[]
    members: { role: string }[]
    /** Prisma filtered relation count: the caller's open tasks (feature 010). */
    _count?: { tasks: number }
  },
  today?: string,
): ProjectListItem {
  return {
    id: row.id,
    name: row.name,
    hospitalName: row.hospitalName,
    status: row.status as ProjectStatus,
    startDate: toIsoDate(row.startDate),
    targetGoLiveDate: toIsoDate(row.targetGoLiveDate),
    myRole: (row.members[0]?.role ?? 'MEMBER') as ProjectRole,
    summary: summarize(row.phases, row.tasks, today),
    myOpenTasks: row._count?.tasks ?? 0,
    updatedAt: row.updatedAt,
  }
}

/** The include tree for one composed project read. */
export const PROJECT_INCLUDE = (now: Date) => ({
  phases: {
    orderBy: { order: 'asc' as const },
    include: {
      owner: PERSON,
      tasks: {
        orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }],
        include: {
          owner: PERSON,
          predecessor: PREDECESSOR,
          comments: {
            orderBy: { createdAt: 'asc' as const },
            include: { author: PERSON, mentions: { include: { user: PERSON } } },
          },
        },
      },
      deliverables: {
        orderBy: { order: 'asc' as const },
        include: { owner: PERSON, reviewer: PERSON },
      },
    },
  },
  members: { orderBy: { addedAt: 'asc' as const }, include: { user: PERSON } },
  stakeholders: { orderBy: { name: 'asc' as const }, include: { user: PERSON } },
  invites: {
    where: { acceptedAt: null, expiresAt: { gt: now } },
    select: { id: true, email: true, projectRole: true, expiresAt: true },
  },
})
