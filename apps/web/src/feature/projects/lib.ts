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

// ---- Feature 010: work views, manual order and shared filters ----

export type WorkSort = 'manual' | 'due' | 'title'
export const WORK_SORTS: ReadonlyArray<{ value: WorkSort; label: string }> = [
  { value: 'manual', label: 'Manual order' },
  { value: 'due', label: 'Due date' },
  { value: 'title', label: 'Title' },
]

/** Search params shared by Board, List and Timeline on `/projects/$id`; absent keys mean "any". */
export interface WorkSearch {
  /** The phase's 1-based position in plan order, so URLs read `?phase=2` rather than an id. */
  phase?: number
  /** Feature 011: free text matched against title and owner name. */
  q?: string
  /** Feature 011: only the signed-in person's tasks. */
  mine?: true
  owner?: string
  status?: TaskData['status']
  overdue?: boolean
  department?: string
  sort?: WorkSort
  /** A task to open in the side panel. */
  task?: string
}

const isTaskStatus = (v: unknown): v is TaskData['status'] =>
  typeof v === 'string' && (TASK_STATUSES as ReadonlyArray<string>).includes(v)
const isWorkSort = (v: unknown): v is WorkSort =>
  typeof v === 'string' && WORK_SORTS.some((s) => s.value === v)

/** Keeps only valid, present keys so URLs stay short and unknown values are dropped. */
export function parseWorkSearch(raw: Record<string, unknown>): WorkSearch {
  const out: WorkSearch = {}
  const phase = Number(raw.phase)
  if (raw.phase !== '' && raw.phase != null && Number.isInteger(phase) && phase >= 1)
    out.phase = phase
  if (typeof raw.owner === 'string' && raw.owner) out.owner = raw.owner
  if (isTaskStatus(raw.status)) out.status = raw.status
  if (raw.overdue === true || raw.overdue === 'true') out.overdue = true
  if (typeof raw.department === 'string' && raw.department) out.department = raw.department
  if (isWorkSort(raw.sort) && raw.sort !== 'manual') out.sort = raw.sort
  if (typeof raw.task === 'string' && raw.task) out.task = raw.task
  if (typeof raw.q === 'string') {
    const q = raw.q.trim().slice(0, MAX_SEARCH_LENGTH)
    if (q) out.q = q
  }
  if (raw.mine === true || raw.mine === 'true') out.mine = true
  return out
}

export const MAX_SEARCH_LENGTH = 100

/** True when any narrowing filter is set (the sort and the open task are not filters). */
export const hasWorkFilters = (search: WorkSearch): boolean =>
  Boolean(
    search.phase ||
    search.owner ||
    search.status ||
    search.overdue ||
    search.department ||
    search.q ||
    search.mine,
  )

export const workSortOf = (search: WorkSearch): WorkSort => search.sort ?? 'manual'

/** Manual order: position, then creation time as a tie-break. */
export const orderByPosition = <T extends { position: number; createdAt: string }>(
  tasks: T[],
): T[] =>
  [...tasks].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))

export function sortTasks<T extends TaskData>(tasks: T[], sort: WorkSort): T[] {
  if (sort === 'due')
    return [...tasks].sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  if (sort === 'title') return [...tasks].sort((a, b) => a.title.localeCompare(b.title))
  return orderByPosition(tasks)
}

/** Phases in plan order; a phase's number is its index here plus one. */
export const phasesInOrder = <T extends { order: number }>(phases: ReadonlyArray<T>): T[] =>
  [...phases].sort((a, b) => a.order - b.order)

/** The 1-based plan position of a phase, as shown in the URL and the filter. */
export const phaseNumber = (phases: ReadonlyArray<PhaseData>, phaseId: string): number =>
  phasesInOrder(phases).findIndex((p) => p.id === phaseId) + 1

/** The phase at a 1-based plan position, or null when the number points past the plan. */
export const phaseAt = (phases: ReadonlyArray<PhaseData>, n: number): PhaseData | null =>
  phasesInOrder(phases)[n - 1] ?? null

// ---- Feature 011: readability (hide done, search, counts, empty states) ----

/** Case- and accent-insensitive comparison key. */
export const normaliseText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const RECENT_DONE_MS = 7 * 24 * 60 * 60 * 1000

/** A completed task still worth showing in the Complete column: finished within seven days. */
export const isRecentlyDone = (
  task: { status: TaskData['status']; completedAt?: string | null },
  now: Date,
): boolean =>
  task.status === 'COMPLETE' &&
  !!task.completedAt &&
  now.getTime() - Date.parse(task.completedAt) < RECENT_DONE_MS

export interface VisibleContext {
  search: WorkSearch
  phases: ReadonlyArray<PhaseData>
  /** The signed-in person, for the Mine switch. */
  userId: string | null
  /** FR-003: when off, completed tasks are hidden. */
  showDone: boolean
  /** Board only: completed tasks inside the recent window stay visible while hiding. */
  recentDoneVisible?: boolean
  now?: Date
}

const matchesText = (task: TaskData, q: string): boolean => {
  const needle = normaliseText(q)
  if (!needle) return true
  return (
    normaliseText(task.title).includes(needle) ||
    (!!task.owner && normaliseText(task.owner.name).includes(needle))
  )
}

/**
 * The tasks a work view draws, in this order of precedence (data-model.md › Derived values):
 * hide done unless shown, filtered to Complete, opened directly, or recent on the Board; then
 * the shared filters; then Mine and the search text. Pure, so every view agrees.
 */
export function visibleTasks<T extends TaskData>(tasks: T[], ctx: VisibleContext): T[] {
  const { search, phases, userId, showDone, recentDoneVisible = false } = ctx
  const now = ctx.now ?? new Date()
  const phaseId = search.phase ? phaseAt(phases, search.phase)?.id : undefined
  if (search.phase && !phaseId) return []
  const keepDone = showDone || search.status === 'COMPLETE'
  return tasks.filter(
    (t) =>
      (keepDone ||
        t.status !== 'COMPLETE' ||
        t.id === search.task ||
        (recentDoneVisible && isRecentlyDone(t, now))) &&
      (!phaseId || t.phaseId === phaseId) &&
      (!search.owner || t.owner?.id === search.owner) &&
      (!search.status || t.status === search.status) &&
      (!search.overdue || t.overdue) &&
      (!search.mine || (!!userId && t.owner?.id === userId)) &&
      (!search.q || matchesText(t, search.q)),
  )
}

/** Completed tasks per phase id, for the "N done" figure on List headers and lanes. */
export function doneCountByPhase(tasks: ReadonlyArray<TaskData>): Map<string, number> {
  const out = new Map<string, number>()
  for (const t of tasks)
    if (t.status === 'COMPLETE') out.set(t.phaseId, (out.get(t.phaseId) ?? 0) + 1)
  return out
}

/** Completed tasks that the current view leaves out. */
export function hiddenDoneCount(
  tasks: ReadonlyArray<TaskData>,
  visible: ReadonlyArray<TaskData>,
): number {
  const shown = new Set(visible.map((t) => t.id))
  return tasks.filter((t) => t.status === 'COMPLETE' && !shown.has(t.id)).length
}

export interface MatchCount {
  matching: number
  total: number
}

/** `matching of total` per container key, e.g. per status or per phase. */
export function matchCounts<T extends TaskData>(
  visible: ReadonlyArray<T>,
  all: ReadonlyArray<T>,
  keyOf: (task: T) => string,
): Map<string, MatchCount> {
  const out = new Map<string, MatchCount>()
  for (const t of all) {
    const key = keyOf(t)
    const entry = out.get(key) ?? { matching: 0, total: 0 }
    entry.total += 1
    out.set(key, entry)
  }
  for (const t of visible) {
    const entry = out.get(keyOf(t))
    if (entry) entry.matching += 1
  }
  return out
}

/** A `setSearch` patch that removes every narrowing filter and keeps sort and the open task. */
export const CLEARED_FILTERS: Partial<WorkSearch> = {
  phase: undefined,
  owner: undefined,
  status: undefined,
  overdue: undefined,
  department: undefined,
  q: undefined,
  mine: undefined,
}

export type EmptyReason = 'none' | 'all-done' | 'no-match' | 'only-done-match'

/**
 * Why a view shows nothing: no tasks at all, everything is done and hidden, the filters match
 * nothing, or they match only hidden completed tasks. Null when the view is not empty.
 */
export function emptyReason(
  all: ReadonlyArray<TaskData>,
  visible: ReadonlyArray<TaskData>,
  ctx: VisibleContext,
): EmptyReason | null {
  if (visible.length > 0) return null
  if (all.length === 0) return 'none'
  if (!hasWorkFilters(ctx.search)) return 'all-done'
  const withDone = visibleTasks([...all], { ...ctx, showDone: true })
  return withDone.length > 0 ? 'only-done-match' : 'no-match'
}

export interface StatusColumn<T> {
  status: TaskData['status']
  tasks: T[]
}

/** The four Board columns in their fixed order, each in manual order. */
export function columnsByStatus<T extends TaskData>(tasks: T[]): StatusColumn<T>[] {
  const ordered = orderByPosition(tasks)
  return TASK_STATUSES.map((status) => ({
    status,
    tasks: ordered.filter((t) => t.status === status),
  }))
}

export interface PhaseGroup<T> {
  phase: PhaseData
  tasks: T[]
}

/** List groups in plan order, each in the requested sort (manual by default). */
export function groupByPhase<T extends TaskData>(
  tasks: T[],
  phases: ReadonlyArray<PhaseData>,
  sort: WorkSort = 'manual',
): PhaseGroup<T>[] {
  const sorted = sortTasks(tasks, sort)
  return phasesInOrder(phases).map((phase) => ({
    phase,
    tasks: sorted.filter((t) => t.phaseId === phase.id),
  }))
}

export interface Neighbours {
  afterTaskId?: string
  beforeTaskId?: string
}

/**
 * Where a dragged item lands inside a container, as the ids of its new neighbours. `orderedIds`
 * is the target container's current order (it may or may not already hold `activeId`); `overId`
 * is the item it was dropped on, or null/unknown to append at the end.
 */
export function neighboursFor(
  orderedIds: ReadonlyArray<string>,
  activeId: string,
  overId: string | null,
): Neighbours {
  const without = orderedIds.filter((id) => id !== activeId)
  if (overId === null || overId === activeId || !without.includes(overId)) {
    const last = without.at(-1)
    return last ? { afterTaskId: last } : {}
  }
  const from = orderedIds.indexOf(activeId)
  const overIndex = without.indexOf(overId)
  // Same container: dragging downwards lands after the item under the pointer, upwards before it.
  const to = from !== -1 && from < orderedIds.indexOf(overId) ? overIndex + 1 : overIndex
  const next = [...without.slice(0, to), activeId, ...without.slice(to)]
  const idx = next.indexOf(activeId)
  const out: Neighbours = {}
  if (idx > 0) out.afterTaskId = next[idx - 1]
  if (idx < next.length - 1) out.beforeTaskId = next[idx + 1]
  return out
}

/** A provisional position for optimistic rendering; the server computes the real one. */
export function provisionalPosition(
  tasks: ReadonlyArray<{ id: string; position: number }>,
  neighbours: Neighbours,
): number {
  const at = (id: string | undefined) => tasks.find((t) => t.id === id)?.position
  const lo = at(neighbours.afterTaskId)
  const hi = at(neighbours.beforeTaskId)
  if (lo !== undefined && hi !== undefined) return (lo + hi) / 2
  if (lo !== undefined) return lo + 1
  if (hi !== undefined) return hi - 1
  return Math.max(0, ...tasks.map((t) => t.position)) + 1
}

// ---- Feature 010: timeline geometry (contracts/ui-interaction.md › Timeline geometry) ----

const DAY_MS = 24 * 60 * 60 * 1000

/** `YYYY-MM-DD` + days → `YYYY-MM-DD`, in UTC so no local offset shifts the day. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Whole days for a horizontal pointer delta at the chart's current day width. */
export const deltaToDays = (deltaPx: number, dayWidth: number): number =>
  dayWidth > 0 ? Math.round(deltaPx / dayWidth) : 0

export interface DateRange {
  startDate: string | null
  dueDate: string | null
}

/** Shift both dates by the same days; a due-only task moves its due date alone. */
export function shiftDates(range: DateRange, days: number): DateRange {
  if (days === 0) return range
  return {
    startDate: range.startDate ? addDays(range.startDate, days) : null,
    dueDate: range.dueDate ? addDays(range.dueDate, days) : null,
  }
}

/** Move one edge only; the server still validates `due >= start`. */
export function resizeDate(range: DateRange, edge: 'start' | 'due', days: number): DateRange {
  if (days === 0) return range
  if (edge === 'start')
    return { ...range, startDate: range.startDate ? addDays(range.startDate, days) : null }
  return { ...range, dueDate: range.dueDate ? addDays(range.dueDate, days) : null }
}
