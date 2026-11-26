import { CalendarDays } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { previewProject, type PhaseStatus } from './project-fixture'

const startTime = Date.parse('2026-06-01T00:00:00Z')
const endTime = Date.parse('2027-07-01T00:00:00Z')
const dayMs = 24 * 60 * 60 * 1000
const months = Array.from({ length: 13 }, (_, index) => new Date(Date.UTC(2026, 5 + index, 1)))
const columns = '12rem repeat(13, 3.5rem)'

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

export function ProjectTimeline() {
  return (
    <Card role="region" aria-label="Project timeline">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <CardTitle>Implementation timeline</CardTitle>
          <CardDescription>Phase schedule and go-live sequence</CardDescription>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          <CalendarDays aria-hidden="true" /> Jun 2026 – Jun 2027
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
                    className="relative border-l border-t bg-background"
                    style={{ gridColumn: 'span 13 / span 13', height: '2.75rem' }}
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 grid"
                      style={{ gridTemplateColumns: 'repeat(13, 3.5rem)' }}
                    >
                      {months.map((month) => (
                        <span key={month.toISOString()} className="border-r border-dashed" />
                      ))}
                    </div>
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
            <span className="size-2.5 rotate-45 rounded-sm bg-primary" />
            Go-live milestone
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
