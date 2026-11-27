import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { ProjectListQuery } from '@/graphql/codegen/graphql'
import { formatDate } from '../lib'
import { StatusBadge } from './StatusBadge'

export type ProjectListRow = ProjectListQuery['projects']['data'][number]

/** One project on the Projects page: progress, status, go-live, overdue and the viewer's own work (FR-016). */
export function ProjectCard({ project: p }: { project: ProjectListRow }) {
  return (
    <Card className="gap-4">
      <CardHeader className="gap-1.5">
        <CardTitle>
          <Link to="/projects/$id/work" params={{ id: p.id }} className="hover:underline">
            {p.name}
          </Link>
        </CardTitle>
        <CardDescription>{p.hospitalName}</CardDescription>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={p.status} />
          <StatusBadge value={p.myRole} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Progress
            value={p.summary.progress}
            aria-label={`${p.summary.progress}% of phases complete`}
          />
          <span className="w-10 text-right text-xs text-muted-foreground">
            {p.summary.progress}%
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Go-live</dt>
          <dd>{formatDate(p.targetGoLiveDate)}</dd>
          <dt className="text-muted-foreground">Open tasks</dt>
          <dd>{p.summary.openTasks}</dd>
          <dt className="text-muted-foreground">Overdue</dt>
          <dd className={p.summary.overdueTasks ? 'font-medium text-destructive' : ''}>
            {p.summary.overdueTasks}
          </dd>
          <dt className="text-muted-foreground">My open tasks</dt>
          <dd>{p.myOpenTasks}</dd>
        </dl>
      </CardContent>
    </Card>
  )
}
