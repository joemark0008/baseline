import { CalendarDays, CircleCheck, CircleDot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { previewProject, type PreviewPhase, type PhaseStatus } from '../fixture'
import { TeamActivity } from './TeamActivity'

function PhaseStatusBadge({ status }: { status: PhaseStatus }) {
  if (status === 'complete') {
    return (
      <Badge variant="secondary">
        <CircleCheck aria-hidden="true" />
        Complete
      </Badge>
    )
  }
  if (status === 'in_progress') {
    return (
      <Badge>
        <CircleDot aria-hidden="true" />
        In progress
      </Badge>
    )
  }
  if (status === 'at_risk') {
    return (
      <Badge className="border-destructive/20 bg-destructive/10 text-destructive">At risk</Badge>
    )
  }
  return <Badge variant="outline">Upcoming</Badge>
}

function formatDate(date: string, withYear = false) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(new Date(`${date}T00:00:00`))
}

const dayMs = 24 * 60 * 60 * 1000

function isDueWithinWeek(dueDate: string, asOf: string) {
  const due = Date.parse(`${dueDate}T00:00:00Z`)
  const start = Date.parse(`${asOf}T00:00:00Z`)
  return due >= start && due < start + 7 * dayMs
}

function PhaseRow({ phase, index }: { phase: PreviewPhase; index: number }) {
  return (
    <li className="flex items-center gap-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{phase.name}</p>
          <PhaseStatusBadge status={phase.status} />
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {formatDate(phase.startDate)} – {formatDate(phase.endDate)}
          </span>
          {phase.status === 'in_progress' ? (
            <span aria-label={`${phase.progress}% complete`}>· {phase.progress}%</span>
          ) : null}
        </div>
      </div>
      {phase.status === 'in_progress' ? (
        <div className="hidden w-28 sm:block">
          <div
            aria-label={`${phase.name} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={phase.progress}
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${phase.progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function ProjectOverview() {
  const completePhases = previewProject.phases.filter((phase) => phase.status === 'complete').length
  const openTasks = previewProject.tasks.filter((task) => task.status !== 'complete').length
  const overdueTasks = previewProject.tasks.filter((task) => task.status === 'overdue').length
  const dueThisWeek = previewProject.tasks.filter(
    (task) => task.status !== 'complete' && isDueWithinWeek(task.dueDate, previewProject.asOfDate),
  ).length
  const currentPhase = previewProject.phases.find(
    (phase) => phase.id === previewProject.currentPhaseId,
  )
  const phasesById = new Map(previewProject.phases.map((phase) => [phase.id, phase.name]))
  const teamById = new Map(previewProject.team.map((member) => [member.id, member]))
  const upcomingTasks = previewProject.tasks
    .filter((task) => task.status === 'upcoming' || task.status === 'in_progress')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="gap-3 pb-2">
            <CardDescription>Overall progress</CardDescription>
            <CardTitle className="text-3xl">{previewProject.overallProgress}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Overall project progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={previewProject.overallProgress}
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${previewProject.overallProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {completePhases} of {previewProject.phases.length} phases complete
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3 pb-2">
            <CardDescription>Current phase</CardDescription>
            <CardTitle className="text-xl">{currentPhase?.name ?? 'Not started'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {currentPhase
                ? `${currentPhase.name} · ends ${formatDate(currentPhase.endDate)}`
                : 'No phase in progress'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3 pb-2">
            <CardDescription>Open tasks</CardDescription>
            <CardTitle className="text-3xl">{openTasks}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {overdueTasks} overdue · {dueThisWeek} due this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3 pb-2">
            <CardDescription>Target go-live</CardDescription>
            <CardTitle className="text-xl">
              {formatDate(previewProject.targetGoLiveDate, true)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-4" />
            <span>Hospital-wide launch</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <h2 className="font-semibold">Upcoming work</h2>
            <CardDescription>Next scheduled tasks across the implementation</CardDescription>
          </div>
          <Badge variant="outline">{upcomingTasks.length} next</Badge>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {upcomingTasks.map((task) => {
              const owner = teamById.get(task.ownerId)
              const phase = phasesById.get(task.phaseId)
              return (
                <li
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                  key={task.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {phase ?? 'Unassigned phase'} · {owner?.name ?? 'Unassigned'}
                    </p>
                  </div>
                  <Badge variant={task.status === 'in_progress' ? 'default' : 'secondary'}>
                    {task.status === 'in_progress' ? 'In progress' : 'Upcoming'}
                  </Badge>
                  <time className="text-sm text-muted-foreground" dateTime={task.dueDate}>
                    {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
                      new Date(`${task.dueDate}T00:00:00Z`),
                    )}
                  </time>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <CardTitle>Implementation phases</CardTitle>
            <CardDescription>End-to-end HIS rollout plan · 9 phases</CardDescription>
          </div>
          <Badge variant="outline">
            {previewProject.status === 'on_track' ? 'On track' : 'Needs attention'}
          </Badge>
        </CardHeader>
        <CardContent>
          <ol aria-label="Implementation phases" className="divide-y">
            {previewProject.phases.map((phase, index) => (
              <PhaseRow key={phase.id} phase={phase} index={index} />
            ))}
          </ol>
        </CardContent>
      </Card>
      <TeamActivity />
    </div>
  )
}
