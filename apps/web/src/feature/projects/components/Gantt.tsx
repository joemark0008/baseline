import {
  DndContext,
  useDraggable,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { AlertTriangle, ChevronRight, Link2 } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { usePointerSensors } from '../dnd/sensors'
import {
  deltaToDays,
  formatDate,
  resizeDate,
  shiftDates,
  type DateRange,
  type PhaseData,
} from '../lib'

export interface GanttProps {
  phases: ReadonlyArray<PhaseData>
  /** Fallback window when no phase or task has dates. */
  startDate: string | null
  targetGoLiveDate: string | null
  onSelectTask?: (taskId: string) => void
  /** When present, task bars shift and resize by drag or keyboard (US3). */
  onTaskDatesChange?: (taskId: string, range: DateRange) => Promise<void> | void
  /** When present (Managers), phase bars do the same. */
  onPhaseDatesChange?: (
    phaseId: string,
    range: { startDate: string; endDate: string },
  ) => Promise<void> | void
  /** Feature 011 FR-012: folded phases draw their phase row only. */
  collapsedPhaseIds?: ReadonlySet<string>
  onTogglePhase?: (phaseId: string) => void
}

type Edge = 'body' | 'start' | 'due'
interface Pending {
  kind: 'task' | 'phase'
  id: string
  edge: Edge
  days: number
}

const dayMs = 24 * 60 * 60 * 1000
const monthWidth = '3.5rem'

function parse(date: string) {
  return Date.parse(`${date}T00:00:00Z`)
}

function monthStart(ms: number) {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
}

function nextMonth(ms: number) {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
}

/** The chart window: the first month any dated item starts in, to the month after the last one ends. */
export function ganttWindow(
  phases: ReadonlyArray<PhaseData>,
  startDate: string | null,
  goLive: string | null,
  extra: ReadonlyArray<string | null> = [],
) {
  const dates: string[] = []
  for (const p of phases) {
    if (p.startDate) dates.push(p.startDate)
    if (p.endDate) dates.push(p.endDate)
    for (const t of p.tasks) {
      if (t.startDate) dates.push(t.startDate)
      if (t.dueDate) dates.push(t.dueDate)
    }
  }
  if (startDate) dates.push(startDate)
  if (goLive) dates.push(goLive)
  for (const d of extra) if (d) dates.push(d)
  if (dates.length === 0) return null
  const sorted = [...dates].sort()
  const start = monthStart(parse(sorted[0]))
  const end = nextMonth(parse(sorted[sorted.length - 1]))
  const months: number[] = []
  for (let cursor = start; cursor < end; cursor = nextMonth(cursor)) months.push(cursor)
  return { start, end, months }
}

const phaseBar: Record<string, string> = {
  COMPLETE: 'bg-primary/55',
  IN_PROGRESS: 'bg-primary',
  UPCOMING: 'bg-muted-foreground/30',
  AT_RISK: 'bg-destructive',
}

/** What a pending edit does to a range: shift the whole bar or move one edge. */
export function previewRange(
  range: DateRange,
  pending: Pending | null,
  kind: Pending['kind'],
  id: string,
): DateRange {
  if (!pending || pending.kind !== kind || pending.id !== id || pending.days === 0) return range
  return pending.edge === 'body'
    ? shiftDates(range, pending.days)
    : resizeDate(range, pending.edge, pending.days)
}

const describe = (range: DateRange) =>
  range.startDate && range.dueDate
    ? `${formatDate(range.startDate, false)} to ${formatDate(range.dueDate, false)}`
    : range.dueDate
      ? `due ${formatDate(range.dueDate, false)}`
      : ''

/** Phase bars with task markers underneath, drawn from real dates; scrolls inside its own region. */
export function Gantt({
  phases,
  startDate,
  targetGoLiveDate,
  onSelectTask,
  onTaskDatesChange,
  onPhaseDatesChange,
  collapsedPhaseIds,
  onTogglePhase,
}: GanttProps) {
  const sensors = usePointerSensors()
  const [pending, setPending] = useState<Pending | null>(null)
  const [live, setLive] = useState('')
  const monthRef = useRef<HTMLDivElement>(null)
  const dayWidth = useRef(0)

  const rangeOf = (kind: Pending['kind'], id: string): DateRange | null => {
    if (kind === 'phase') {
      const p = phases.find((x) => x.id === id)
      return p ? { startDate: p.startDate, dueDate: p.endDate } : null
    }
    for (const p of phases) {
      const t = p.tasks.find((x) => x.id === id)
      if (t) return { startDate: t.startDate, dueDate: t.dueDate }
    }
    return null
  }
  const titleOf = (kind: Pending['kind'], id: string) =>
    kind === 'phase'
      ? (phases.find((x) => x.id === id)?.name ?? 'phase')
      : (phases.flatMap((p) => p.tasks).find((t) => t.id === id)?.title ?? 'task')

  const pendingDates = pending
    ? previewRange(
        rangeOf(pending.kind, pending.id) ?? { startDate: null, dueDate: null },
        pending,
        pending.kind,
        pending.id,
      )
    : null
  const window = ganttWindow(
    phases,
    startDate,
    targetGoLiveDate,
    pendingDates ? [pendingDates.startDate, pendingDates.dueDate] : [],
  )
  if (!window) {
    return (
      <p className="text-sm text-muted-foreground">
        Add start and end dates to phases, or due dates to tasks, and the timeline draws itself.
      </p>
    )
  }
  const { start, end, months } = window
  const totalDays = (end - start) / dayMs
  const position = (date: string) =>
    Math.min(100, Math.max(0, ((parse(date) - start) / (end - start)) * 100))
  const width = (from: string, to: string) =>
    Math.min(100, Math.max(0, ((parse(to) + dayMs - parse(from)) / (end - start)) * 100))
  const columns = `12rem repeat(${months.length}, ${monthWidth})`
  const chartSpan = `span ${months.length} / span ${months.length}`
  const monthLabel = (ms: number, i: number) =>
    new Date(ms).toLocaleDateString('en', {
      month: 'short',
      ...(i === 0 || i === months.length - 1 ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    })

  async function commit(p: Pending) {
    const base = rangeOf(p.kind, p.id)
    setPending(null)
    if (!base || p.days === 0) return
    const next = previewRange(base, p, p.kind, p.id)
    try {
      if (p.kind === 'task') await onTaskDatesChange?.(p.id, next)
      else if (next.startDate && next.dueDate)
        await onPhaseDatesChange?.(p.id, { startDate: next.startDate, endDate: next.dueDate })
      setLive('Saved.')
    } catch {
      setLive('Could not save.')
    }
  }

  function cancel() {
    setPending(null)
    setLive('Cancelled.')
  }

  /** Keyboard map from contracts/ui-interaction.md: arrows shift, Shift ×7, Alt resizes, Enter saves. */
  function onBarKeyDown(e: KeyboardEvent, kind: Pending['kind'], id: string) {
    if (e.key === 'Escape') {
      if (pending) {
        e.preventDefault()
        cancel()
      }
      return
    }
    if (e.key === 'Enter' && pending && pending.id === id) {
      e.preventDefault()
      void commit(pending)
      return
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const direction = e.key === 'ArrowRight' ? 1 : -1
    const edge: Edge = e.altKey ? (e.shiftKey ? 'start' : 'due') : 'body'
    const step = !e.altKey && e.shiftKey ? 7 : 1
    const current = pending && pending.id === id && pending.edge === edge ? pending.days : 0
    const next: Pending = { kind, id, edge, days: current + direction * step }
    setPending(next)
    const base = rangeOf(kind, id)
    if (base)
      setLive(
        `${titleOf(kind, id)} now ${describe(previewRange(base, next, kind, id))}. Press Enter to save.`,
      )
  }

  function onDragStart({ active }: DragStartEvent) {
    const data = active.data.current as
      { kind: Pending['kind']; id: string; edge: Edge } | undefined
    if (!data) return
    const monthPx = monthRef.current?.getBoundingClientRect().width ?? 0
    dayWidth.current = (monthPx * months.length) / totalDays
    setPending({ ...data, days: 0 })
  }

  function onDragMove({ delta }: DragMoveEvent) {
    setPending((p) => (p ? { ...p, days: deltaToDays(delta.x, dayWidth.current) } : p))
  }

  function onDragEnd({ delta }: DragEndEvent) {
    setPending((p) => {
      if (p) void commit({ ...p, days: deltaToDays(delta.x, dayWidth.current) })
      return null
    })
  }

  const grid = (
    <div
      aria-hidden="true"
      className="absolute inset-0 grid"
      style={{ gridTemplateColumns: `repeat(${months.length}, ${monthWidth})` }}
    >
      {months.map((m) => (
        <span key={m} className="border-r border-dashed" />
      ))}
    </div>
  )
  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis]}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={cancel}
    >
      <div className="flex flex-col gap-4">
        <p aria-live="polite" className="sr-only">
          {live}
        </p>
        <div
          className="overflow-x-auto rounded-lg border"
          tabIndex={0}
          aria-label="Scrollable Gantt timeline"
        >
          <div className="grid w-max" style={{ gridTemplateColumns: columns }}>
            <div className="sticky left-0 z-20 flex items-center bg-card px-4 py-3 text-xs font-medium text-muted-foreground">
              PHASE / TASK
            </div>
            {months.map((m, i) => (
              <div
                key={m}
                ref={i === 0 ? monthRef : undefined}
                className="flex items-center justify-center border-l bg-muted/30 px-1 py-3 text-xs text-muted-foreground"
              >
                {monthLabel(m, i)}
              </div>
            ))}
            {[...phases]
              .sort((a, b) => a.order - b.order)
              .map((phase, index) => {
                const phaseRange = previewRange(
                  { startDate: phase.startDate, dueDate: phase.endDate },
                  pending,
                  'phase',
                  phase.id,
                )
                const folded = collapsedPhaseIds?.has(phase.id) ?? false
                return (
                  <div className="contents" key={phase.id}>
                    <div className="sticky left-0 z-10 flex min-w-0 items-center gap-2 border-t bg-card px-4 py-3">
                      {onTogglePhase ? (
                        <button
                          type="button"
                          aria-expanded={!folded}
                          aria-label={`${folded ? 'Expand' : 'Collapse'} ${phase.name}`}
                          className="flex shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          onClick={() => onTogglePhase(phase.id)}
                        >
                          <ChevronRight
                            aria-hidden="true"
                            className={`size-4 motion-safe:transition-transform ${folded ? '' : 'rotate-90'}`}
                          />
                        </button>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate text-sm font-medium">{phase.name}</span>
                      {folded ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          ({phase.tasks.length} {phase.tasks.length === 1 ? 'task' : 'tasks'})
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="relative border-t border-l bg-background"
                      style={{ gridColumn: chartSpan, height: '2.75rem' }}
                    >
                      {grid}
                      {phaseRange.startDate && phaseRange.dueDate ? (
                        <Bar
                          kind="phase"
                          id={phase.id}
                          label={`${phase.name}: ${phaseRange.startDate} to ${phaseRange.dueDate}`}
                          interactive={Boolean(onPhaseDatesChange)}
                          pendingText={
                            pending?.kind === 'phase' && pending.id === phase.id
                              ? describe(phaseRange)
                              : null
                          }
                          className={`top-3 h-5 ${phaseBar[phase.status] ?? phaseBar.UPCOMING}`}
                          left={position(phaseRange.startDate)}
                          width={Math.max(width(phaseRange.startDate, phaseRange.dueDate), 1.5)}
                          onKeyDown={(e) => onBarKeyDown(e, 'phase', phase.id)}
                        />
                      ) : (
                        <span className="absolute top-3 left-2 text-xs text-muted-foreground">
                          No dates
                        </span>
                      )}
                    </div>
                    {(folded ? [] : [...phase.tasks])
                      .sort((a, b) => a.position - b.position)
                      .map((task) => {
                        const range = previewRange(
                          { startDate: task.startDate, dueDate: task.dueDate },
                          pending,
                          'task',
                          task.id,
                        )
                        const colour = task.overdue
                          ? 'bg-destructive'
                          : task.status === 'COMPLETE'
                            ? 'bg-primary/55'
                            : 'bg-primary/80'
                        const isPending = pending?.kind === 'task' && pending.id === task.id
                        return (
                          <div className="contents" key={task.id}>
                            <div className="sticky left-0 z-10 flex min-w-0 items-center gap-2 border-t bg-card py-2 pr-4 pl-10">
                              {onSelectTask ? (
                                <button
                                  type="button"
                                  className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground hover:text-foreground hover:underline"
                                  onClick={() => onSelectTask(task.id)}
                                >
                                  {task.title}
                                </button>
                              ) : (
                                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                  {task.title}
                                </span>
                              )}
                              {task.predecessorConflict ? (
                                <span
                                  role="img"
                                  aria-label={`Starts before ${task.predecessor?.title ?? 'its predecessor'} is due`}
                                  title={`Starts before ${task.predecessor?.title ?? 'its predecessor'} is due`}
                                  className="flex shrink-0 text-destructive"
                                >
                                  <AlertTriangle aria-hidden="true" className="size-3.5" />
                                </span>
                              ) : task.predecessor ? (
                                <span
                                  role="img"
                                  aria-label={`Depends on ${task.predecessor.title}`}
                                  title={`Depends on ${task.predecessor.title}`}
                                  className="flex shrink-0 text-muted-foreground"
                                >
                                  <Link2 aria-hidden="true" className="size-3.5" />
                                </span>
                              ) : null}
                            </div>
                            <div
                              className="relative border-t border-l bg-background"
                              style={{ gridColumn: chartSpan, height: '2rem' }}
                            >
                              {grid}
                              {range.startDate && range.dueDate ? (
                                <Bar
                                  kind="task"
                                  id={task.id}
                                  label={`${task.title}: ${range.startDate} to ${range.dueDate}${task.overdue ? ', overdue' : ''}`}
                                  interactive={Boolean(onTaskDatesChange)}
                                  pendingText={isPending ? describe(range) : null}
                                  className={`top-2.5 h-3 ${colour}`}
                                  left={position(range.startDate)}
                                  width={Math.max(width(range.startDate, range.dueDate), 1)}
                                  onKeyDown={(e) => onBarKeyDown(e, 'task', task.id)}
                                />
                              ) : range.dueDate ? (
                                <Bar
                                  kind="task"
                                  id={task.id}
                                  label={`${task.title}: due ${range.dueDate}${task.overdue ? ', overdue' : ''}`}
                                  interactive={Boolean(onTaskDatesChange)}
                                  pendingText={isPending ? describe(range) : null}
                                  className={`top-2.5 size-3 -translate-x-1/2 rotate-45 rounded-sm ${task.overdue ? 'bg-destructive' : task.status === 'COMPLETE' ? 'bg-primary/55' : 'bg-muted-foreground/60'}`}
                                  left={position(range.dueDate)}
                                  width={null}
                                  onKeyDown={(e) => onBarKeyDown(e, 'task', task.id)}
                                />
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )
              })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-primary" />
            Phase in progress
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-primary/55" />
            Complete
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            Upcoming
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-destructive" />
            At risk / overdue
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rotate-45 rounded-sm bg-muted-foreground/60" />
            Task due date
          </span>
          <span className="flex items-center gap-2">
            <Link2 aria-hidden="true" className="size-3.5" />
            Depends on an earlier task
          </span>
          <span className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="size-3.5 text-destructive" />
            Starts before its predecessor is due
          </span>
          {onTaskDatesChange ? (
            <span>
              Drag a bar to shift it, drag an end to resize; or focus it and use the arrow keys
              (Shift for a week, Alt for an end), Enter to save.
            </span>
          ) : null}
        </div>
      </div>
    </DndContext>
  )
}

interface BarProps {
  kind: Pending['kind']
  id: string
  label: string
  interactive: boolean
  /** The dates shown next to the bar while it is being moved. */
  pendingText: string | null
  className: string
  left: number
  /** Percent, or null for a due-date marker. */
  width: number | null
  onKeyDown: (e: KeyboardEvent) => void
}

/** A bar that is a plain image when read-only, or a focusable control with drag handles. */
function Bar({
  kind,
  id,
  label,
  interactive,
  pendingText,
  className,
  left,
  width,
  onKeyDown,
}: BarProps) {
  const {
    setNodeRef: setBodyRef,
    listeners: bodyListeners,
    attributes: bodyAttributes,
  } = useDraggable({
    id: `${kind}:${id}:body`,
    data: { kind, id, edge: 'body' },
    disabled: !interactive,
  })
  const { setNodeRef: setStartRef, listeners: startListeners } = useDraggable({
    id: `${kind}:${id}:start`,
    data: { kind, id, edge: 'start' },
    disabled: !interactive || width === null,
  })
  const { setNodeRef: setDueRef, listeners: dueListeners } = useDraggable({
    id: `${kind}:${id}:due`,
    data: { kind, id, edge: 'due' },
    disabled: !interactive,
  })
  const style = { left: `${left}%`, ...(width !== null ? { width: `${width}%` } : {}) }
  const rounded = width !== null ? 'rounded-full' : ''
  if (!interactive) {
    return (
      <span
        role="img"
        aria-label={label}
        className={`absolute z-10 ${rounded} ${className}`}
        style={style}
      />
    )
  }
  return (
    <>
      <button
        ref={setBodyRef}
        type="button"
        {...bodyListeners}
        {...bodyAttributes}
        aria-label={`${label}. Arrow keys move it; Enter saves.`}
        aria-roledescription="draggable bar"
        data-pending={pendingText ? 'true' : undefined}
        className={`absolute z-10 cursor-grab touch-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing data-[pending=true]:ring-2 data-[pending=true]:ring-primary ${rounded} ${className}`}
        style={style}
        onKeyDown={onKeyDown}
      />
      {width !== null ? (
        <>
          <span
            ref={setStartRef}
            aria-hidden="true"
            className="absolute z-20 h-5 w-2 -translate-x-1/2 cursor-ew-resize touch-none"
            style={{ left: `${left}%`, top: '0.25rem' }}
            {...startListeners}
          />
          <span
            ref={setDueRef}
            aria-hidden="true"
            className="absolute z-20 h-5 w-2 -translate-x-1/2 cursor-ew-resize touch-none"
            style={{ left: `calc(${left + width}% )`, top: '0.25rem' }}
            {...dueListeners}
          />
        </>
      ) : null}
      {pendingText ? (
        <span
          aria-hidden="true"
          className="absolute -top-5 z-30 rounded bg-popover px-1.5 py-0.5 text-xs whitespace-nowrap text-popover-foreground shadow"
          style={{ left: `${left}%` }}
        >
          {pendingText}
        </span>
      ) : null}
    </>
  )
}
