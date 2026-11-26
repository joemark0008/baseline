import { CalendarDays, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { previewProject, type PhaseStatus, type PreviewTask, type TaskStatus } from '../fixture'

const dayMs = 24 * 60 * 60 * 1000

/** The chart window: from the first day of the earliest phase's month to the day after the last phase's month. */
function chartWindow() {
  const starts = previewProject.phases.map((phase) => Date.parse(`${phase.startDate}T00:00:00Z`))
  const ends = previewProject.phases.map((phase) => Date.parse(`${phase.endDate}T00:00:00Z`))
  const first = new Date(Math.min(...starts))
  const last = new Date(Math.max(...ends))
  const startTime = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1)
  const endTime = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 1)
  const months: Date[] = []
  for (let cursor = new Date(startTime); cursor.getTime() < endTime;) {
    months.push(cursor)
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  }
  return { startTime, endTime, months }
}

const { startTime, endTime, months } = chartWindow()
const monthWidth = '3.5rem'
const columns = `12rem repeat(${months.length}, ${monthWidth})`
const chartSpan = `span ${months.length} / span ${months.length}`

function monthLabel(month: Date, index: number) {
  return month.toLocaleDateString('en', {
    month: 'short',
    ...(index === 0 || index === months.length - 1 ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

function position(date: string) {
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  return Math.min(100, Math.max(0, ((timestamp - startTime) / (endTime - startTime)) * 100))
}

function phaseWidth(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`) + dayMs
  return Math.min(100, Math.max(0, ((end - start) / (endTime - startTime)) * 100))
}

const phaseBarClass: Record<PhaseStatus, string> = {
  complete: 'bg-primary/55',
  in_progress: 'bg-primary',
  upcoming: 'bg-muted-foreground/30',
  at_risk: 'bg-destructive',
}

const taskMarkerClass: Record<TaskStatus, string> = {
  complete: 'bg-primary/55',
  in_progress: 'bg-primary',
  upcoming: 'bg-muted-foreground/60',
  blocked: 'bg-destructive',
  overdue: 'bg-destructive',
}

function MonthGrid() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 grid"
      style={{ gridTemplateColumns: `repeat(${months.length}, ${monthWidth})` }}
    >
      {months.map((month) => (
        <span key={month.toISOString()} className="border-r border-dashed" />
      ))}
    </div>
  )
}

function TaskRow({ task, tasksById }: { task: PreviewTask; tasksById: Map<string, PreviewTask> }) {
  const predecessors = task.predecessorIds
    .map((id) => tasksById.get(id))
    .filter((item): item is PreviewTask => item !== undefined)
  return (
    <div className="contents">
      <div className="sticky left-0 z-10 flex min-w-0 items-center gap-2 border-t bg-card py-2 pr-4 pl-10">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{task.title}</span>
        {predecessors.map((predecessor) => (
          <span
            aria-label={`Depends on ${predecessor.title}`}
            className="flex shrink-0 items-center text-muted-foreground"
            key={predecessor.id}
            role="img"
            title={`Depends on ${predecessor.title}`}
          >
            <Link2 aria-hidden="true" className="size-3.5" />
          </span>
        ))}
      </div>
      <div
        className="relative border-t border-l bg-background"
        style={{ gridColumn: chartSpan, height: '2rem' }}
      >
        <MonthGrid />
        <span
          aria-label={`${task.title}: due ${task.dueDate}`}
          className={`absolute top-2.5 z-10 size-3 -translate-x-1/2 rotate-45 rounded-sm ${taskMarkerClass[task.status]}`}
          role="img"
          style={{ left: `${position(task.dueDate)}%` }}
        />
      </div>
    </div>
  )
}

export function ProjectTimeline() {
  const tasksById = new Map(previewProject.tasks.map((task) => [task.id, task]))
  const tasksByPhase = new Map<string, PreviewTask[]>()
  for (const task of [...previewProject.tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    tasksByPhase.set(task.phaseId, [...(tasksByPhase.get(task.phaseId) ?? []), task])
  }
  const rangeLabel = `${monthLabel(months[0], 0)} – ${monthLabel(months[months.length - 1], months.length - 1)}`

  return (
    <Card role="region" aria-label="Project timeline">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <CardTitle>Implementation timeline</CardTitle>
          <CardDescription>Phase schedule, task due dates and go-live sequence</CardDescription>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          <CalendarDays aria-hidden="true" /> {rangeLabel}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          className="overflow-x-auto rounded-lg border"
          tabIndex={0}
          aria-label="Scrollable Gantt timeline"
        >
          <div className="grid w-max" style={{ gridTemplateColumns: columns }}>
            <div className="sticky left-0 z-20 flex items-center bg-card px-4 py-3 text-xs font-medium text-muted-foreground">
              IMPLEMENTATION PHASE
            </div>
            {months.map((month, index) => (
              <div
                key={month.toISOString()}
                className="flex items-center justify-center border-l bg-muted/30 px-1 py-3 text-xs text-muted-foreground"
              >
                {monthLabel(month, index)}
              </div>
            ))}
            {previewProject.phases.map((phase, index) => {
              const left = position(phase.startDate)
              const width = phaseWidth(phase.startDate, phase.endDate)
              return (
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
                    <MonthGrid />
                    <div
                      aria-label={`${phase.name}: ${phase.startDate} to ${phase.endDate}`}
                      className={`absolute top-3 z-10 h-5 rounded-full ${phaseBarClass[phase.status]}`}
                      role="img"
                      style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
                    />
                    {phase.id === 'go-live' ? (
                      <span
                        aria-label="Target go-live milestone"
                        className="absolute top-3 z-20 size-5 rotate-45 rounded-sm border-2 border-background bg-primary"
                        role="img"
                        style={{ left: `${left}%` }}
                      />
                    ) : null}
                  </div>
                  {(tasksByPhase.get(phase.id) ?? []).map((task) => (
                    <TaskRow key={task.id} task={task} tasksById={tasksById} />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-primary/55" />
            Complete
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-primary" />
            In progress
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            Upcoming
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rotate-45 rounded-sm bg-destructive" />
            Task overdue or blocked
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
            <span className="size-2.5 rotate-45 rounded-sm bg-primary" />
            Go-live milestone
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
