import { Link2 } from 'lucide-react'
import type { PhaseData } from '../lib'

export interface GanttProps {
  phases: ReadonlyArray<PhaseData>
  /** Fallback window when no phase or task has dates. */
  startDate: string | null
  targetGoLiveDate: string | null
  onSelectTask?: (taskId: string) => void
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

/** Phase bars with task markers underneath, drawn from real dates; scrolls inside its own region. */
export function Gantt({ phases, startDate, targetGoLiveDate, onSelectTask }: GanttProps) {
  const window = ganttWindow(phases, startDate, targetGoLiveDate)
  if (!window) {
    return (
      <p className="text-sm text-muted-foreground">
        Add start and end dates to phases, or due dates to tasks, and the timeline draws itself.
      </p>
    )
  }
  const { start, end, months } = window
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
    <div className="flex flex-col gap-4">
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
              className="flex items-center justify-center border-l bg-muted/30 px-1 py-3 text-xs text-muted-foreground"
            >
              {monthLabel(m, i)}
            </div>
          ))}
          {[...phases]
            .sort((a, b) => a.order - b.order)
            .map((phase, index) => (
              <div className="contents" key={phase.id}>
                <div className="sticky left-0 z-10 flex min-w-0 items-center gap-2 border-t bg-card px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate text-sm font-medium">{phase.name}</span>
                </div>
                <div
                  className="relative border-t border-l bg-background"
                  style={{ gridColumn: chartSpan, height: '2.75rem' }}
                >
                  {grid}
                  {phase.startDate && phase.endDate ? (
                    <div
                      aria-label={`${phase.name}: ${phase.startDate} to ${phase.endDate}`}
                      className={`absolute top-3 z-10 h-5 rounded-full ${phaseBar[phase.status] ?? phaseBar.UPCOMING}`}
                      role="img"
                      style={{
                        left: `${position(phase.startDate)}%`,
                        width: `${Math.max(width(phase.startDate, phase.endDate), 1.5)}%`,
                      }}
                    />
                  ) : (
                    <span className="absolute top-3 left-2 text-xs text-muted-foreground">
                      No dates
                    </span>
                  )}
                </div>
                {[...phase.tasks]
                  .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
                  .map((task) => (
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
                        {task.predecessor ? (
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
                        {task.startDate && task.dueDate ? (
                          <span
                            role="img"
                            aria-label={`${task.title}: ${task.startDate} to ${task.dueDate}${task.overdue ? ', overdue' : ''}`}
                            className={`absolute top-2.5 z-10 h-3 rounded-full ${task.overdue ? 'bg-destructive' : task.status === 'COMPLETE' ? 'bg-primary/55' : 'bg-primary/80'}`}
                            style={{
                              left: `${position(task.startDate)}%`,
                              width: `${Math.max(width(task.startDate, task.dueDate), 1)}%`,
                            }}
                          />
                        ) : task.dueDate ? (
                          <span
                            role="img"
                            aria-label={`${task.title}: due ${task.dueDate}${task.overdue ? ', overdue' : ''}`}
                            className={`absolute top-2.5 z-10 size-3 -translate-x-1/2 rotate-45 rounded-sm ${task.overdue ? 'bg-destructive' : task.status === 'COMPLETE' ? 'bg-primary/55' : 'bg-muted-foreground/60'}`}
                            style={{ left: `${position(task.dueDate)}%` }}
                          />
                        ) : null}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
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
      </div>
    </div>
  )
}
