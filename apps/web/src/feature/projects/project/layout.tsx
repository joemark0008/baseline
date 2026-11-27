import { useQuery } from '@apollo/client/react'
import { getRouteApi, Link, Outlet, useLocation } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ProjectDialog } from '../components/ProjectDialog'
import { StatusBadge } from '../components/StatusBadge'
import { formatDate } from '../lib'
import { PROJECT } from '../operations'
import { ReadabilityProvider } from '../readability'
import { writeViewPreference, type WorkView } from '../view-preferences'
import { ProjectContext } from './context'

const WORK_VIEWS: ReadonlyArray<{
  view: WorkView
  label: string
  to: '/projects/$id/board' | '/projects/$id/list' | '/projects/$id/timeline'
}> = [
  { view: 'board', label: 'Board', to: '/projects/$id/board' },
  { view: 'list', label: 'List', to: '/projects/$id/list' },
  { view: 'timeline', label: 'Timeline', to: '/projects/$id/timeline' },
]

const PAGES = [
  { label: 'Overview', to: '/projects/$id' as const, exact: true },
  { label: 'Data readiness', to: '/projects/$id/readiness' as const },
  { label: 'Team', to: '/projects/$id/team' as const },
  { label: 'Stakeholders', to: '/projects/$id/stakeholders' as const },
  { label: 'Activity', to: '/projects/$id/activity' as const },
]

const projectRoute = getRouteApi('/_protected/projects/$id')

/** Compact header, the Work switcher and the project pages shared by every project route (US5). */
export function ProjectLayout({ id }: { id: string }) {
  const { data, loading, error, refetch } = useQuery(PROJECT, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const { pathname } = useLocation()
  const search = projectRoute.useSearch()
  const [editing, setEditing] = useState(false)
  const currentView =
    WORK_VIEWS.find((v) => pathname.startsWith(v.to.replace('$id', id)))?.view ?? null
  useEffect(() => {
    if (currentView) writeViewPreference(id, { view: currentView, search })
  }, [id, currentView, search])
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
  return (
    <ProjectContext.Provider value={{ project, refetch }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <PageHeader
            title={project.name}
            description={`${project.hospitalName} · HIS implementation`}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <StatusBadge value={project.status} />
            <StatusBadge value={project.myRole} />
            <span className="flex items-center gap-2">
              <Progress
                value={summary.progress}
                className="w-24"
                aria-label={`${summary.progress}% of phases complete`}
              />
              <span className="text-xs text-muted-foreground">
                {summary.completePhases} of {summary.phaseCount} phases
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {summary.openTasks} open ·{' '}
              <span className={summary.overdueTasks ? 'font-medium text-destructive' : ''}>
                {summary.overdueTasks} overdue
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              Go-live {formatDate(project.targetGoLiveDate)}
            </span>
            <span className="text-xs text-muted-foreground">{project.members.length} people</span>
          </div>
        </div>
        {project.can.manage ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit project
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <nav aria-label="Work views" className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">Work</span>
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5" role="group">
            {WORK_VIEWS.map((view) => {
              const active = currentView === view.view
              return (
                <Button key={view.view} asChild size="sm" variant={active ? 'default' : 'ghost'}>
                  <Link
                    to={view.to}
                    params={{ id }}
                    search={(prev) => prev}
                    aria-current={active ? 'page' : undefined}
                  >
                    {view.label}
                  </Link>
                </Button>
              )
            })}
          </div>
        </nav>
        <nav aria-label="Project pages" className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs font-medium text-muted-foreground uppercase">Pages</span>
          {PAGES.map((page) => {
            const href = page.to.replace('$id', id)
            const active = page.exact ? pathname === href : pathname.startsWith(href)
            return (
              <Button key={page.to} asChild size="sm" variant={active ? 'secondary' : 'ghost'}>
                <Link to={page.to} params={{ id }} aria-current={active ? 'page' : undefined}>
                  {page.label}
                </Link>
              </Button>
            )
          })}
        </nav>
      </div>
      <ReadabilityProvider
        key={project.id}
        projectId={project.id}
        phaseIds={project.phases.map((p) => p.id)}
      >
        <Outlet />
      </ReadabilityProvider>
      {editing ? <ProjectDialog open project={project} onOpenChange={setEditing} /> : null}
    </ProjectContext.Provider>
  )
}
