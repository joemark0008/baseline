import type { ProjectQuery } from '@/graphql/codegen/graphql'

export type ProjectData = ProjectQuery['project']
export type PhaseData = ProjectData['phases'][number]
export type TaskData = PhaseData['tasks'][number]
export type DeliverableData = PhaseData['deliverables'][number]
export type MemberData = ProjectData['members'][number]
export type StakeholderData = ProjectData['stakeholders'][number]
export type Person = MemberData['user']

/** `YYYY-MM-DD` → "3 Dec 2026"; null → "—". The string never passes through a Date in local time. */
export function formatDate(value: string | null | undefined, withYear = true): string {
  if (!value) return '—'
  const [y, m, d] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}

export const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

export const LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETE: 'Complete',
  UPCOMING: 'Upcoming',
  IN_PROGRESS: 'In progress',
  AT_RISK: 'At risk',
  BLOCKED: 'Blocked',
  NOT_STARTED: 'Not started',
  IN_REVIEW: 'In review',
  READY: 'Ready',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  OUTPUT: 'Output',
  DATA_CATEGORY: 'Data category',
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes requested',
  MANAGER: 'Manager',
  MEMBER: 'Member',
}

export const label = (value: string | null | undefined) => (value ? (LABELS[value] ?? value) : '—')

export const PHASE_STATUSES = ['UPCOMING', 'IN_PROGRESS', 'AT_RISK', 'COMPLETE'] as const
export const TASK_STATUSES = ['UPCOMING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE'] as const
export const TASK_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
export const DELIVERABLE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'READY'] as const
export const PROJECT_STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETE'] as const

/** Sorts phases by order and returns their tasks flattened, in phase order. */
export const allTasks = (project: ProjectData): TaskData[] =>
  [...project.phases].sort((a, b) => a.order - b.order).flatMap((p) => p.tasks)
