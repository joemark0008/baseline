import { useQuery } from '@apollo/client/react'
import { Link, useNavigate, useRouteContext } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { QueryStateRow } from '@/components/QueryStateRow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { can } from '@/lib/access'
import { ProjectDialog } from './components/ProjectDialog'
import { StatusBadge } from './components/StatusBadge'
import { formatDate } from './lib'
import { PROJECT_LIST } from './operations'

/** The implementation projects the signed-in person belongs to. */
export function ProjectsPage() {
  const { access } = useRouteContext({ from: '/_protected' })
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const { data, loading, error } = useQuery(PROJECT_LIST, {
    variables: { page: 1, perPage: 100 },
    fetchPolicy: 'cache-and-network',
  })
  const rows = error ? [] : (data?.projects.data ?? [])
  return (
    <>
      <PageHeader
        title="Projects"
        description="Hospital information system implementations and where each one stands."
      />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Your projects</CardTitle>
            <CardDescription>You see the projects you are a Manager or Member of.</CardDescription>
          </div>
          {can(access, 'projects', 'add') ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              New project
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-40">Progress</TableHead>
                <TableHead className="text-right">Open tasks</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead>Go-live</TableHead>
                <TableHead>Your role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <QueryStateRow
                colSpan={8}
                loading={loading && !data}
                error={error?.message ?? null}
                isEmpty={data?.projects.data.length === 0}
                emptyMessage="No projects yet. Create one to start from the standard lifecycle."
              />
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      to="/projects/$id"
                      params={{ id: p.id }}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.hospitalName}</TableCell>
                  <TableCell>
                    <StatusBadge value={p.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={p.summary.progress}
                        aria-label={`${p.summary.progress}% of phases complete`}
                      />
                      <span className="w-10 text-right text-xs text-muted-foreground">
                        {p.summary.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{p.summary.openTasks}</TableCell>
                  <TableCell
                    className={`text-right ${p.summary.overdueTasks ? 'text-destructive' : ''}`}
                  >
                    {p.summary.overdueTasks}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(p.targetGoLiveDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={p.myRole} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {creating ? (
        <ProjectDialog
          open
          onOpenChange={setCreating}
          onCreated={(id) => navigate({ to: '/projects/$id', params: { id } })}
        />
      ) : null}
    </>
  )
}
