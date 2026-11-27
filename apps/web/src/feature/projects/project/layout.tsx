import { useQuery } from '@apollo/client/react'
import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectDialog } from '../components/ProjectDialog'
import { StatusBadge } from '../components/StatusBadge'
import { formatDate } from '../lib'
import { PROJECT } from '../operations'
import { ProjectContext } from './context'

const TABS = [
  { label: 'Overview', to: '/projects/$id' as const, exact: true },
  { label: 'Timeline', to: '/projects/$id/timeline' as const },
  { label: 'Tasks', to: '/projects/$id/tasks' as const },
  { label: 'Data readiness', to: '/projects/$id/readiness' as const },
  { label: 'Team', to: '/projects/$id/team' as const },
  { label: 'Stakeholders', to: '/projects/$id/stakeholders' as const },
  { label: 'Activity', to: '/projects/$id/activity' as const },
]

/** Header, summary strip and tab navigation shared by every project page. */
export function ProjectLayout({ id }: { id: string }) {
  const { data, loading, error, refetch } = useQuery(PROJECT, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const { pathname } = useLocation()
  const [editing, setEditing] = useState(false)
  if (error) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }
  if (!data)
    return <p className="text-sm text-muted-foreground">{loading ? 'Loading…' : 'Not found'}</p>
  const project = data.project
  const { summary } = project
  const current = project.phases.find((p) => p.status === 'IN_PROGRESS') ?? null
  return (
    <ProjectContext.Provider value={{ project, refetch }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <PageHeader
            title={project.name}
            description={`${project.hospitalName} · HIS implementation`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={project.status} />
            <StatusBadge value={project.myRole} />
            <span className="text-xs text-muted-foreground">
              {formatDate(project.startDate)} – {formatDate(project.targetGoLiveDate)}
            </span>
          </div>
        </div>
        {project.can.manage ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit project
          </Button>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="gap-3 pb-2">
            <CardDescription>Progress</CardDescription>
            <CardTitle className="text-3xl">{summary.progress}%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary.completePhases} of {summary.phaseCount} phases complete
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3 pb-2">
            <CardDescription>Current phase</CardDescription>
            <CardTitle className="text-xl">{current?.name ?? 'None in progress'}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {current
              ? `Ends ${formatDate(current.endDate)}`
              : 'Mark a phase as in progress on Overview'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3 pb-2">
            <CardDescription>Open tasks</CardDescription>
            <CardTitle className="text-3xl">{summary.openTasks}</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-xs ${summary.overdueTasks ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {summary.overdueTasks} overdue
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3 pb-2">
            <CardDescription>Target go-live</CardDescription>
            <CardTitle className="text-xl">{formatDate(project.targetGoLiveDate)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {project.members.length} people on the project
          </CardContent>
        </Card>
      </div>
      <nav aria-label="Project pages" className="flex flex-wrap gap-2 border-b pb-3">
        {TABS.map((tab) => {
          const href = tab.to.replace('$id', id)
          const active = tab.exact ? pathname === href : pathname.startsWith(href)
          return (
            <Button key={tab.to} asChild size="sm" variant={active ? 'default' : 'ghost'}>
              <Link to={tab.to} params={{ id }} aria-current={active ? 'page' : undefined}>
                {tab.label}
              </Link>
            </Button>
          )
        })}
      </nav>
      <Outlet />
      {editing ? <ProjectDialog open project={project} onOpenChange={setEditing} /> : null}
    </ProjectContext.Provider>
  )
}
