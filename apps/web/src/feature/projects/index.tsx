import { useQuery } from '@apollo/client/react'
import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import type { ProjectsSort } from '@/graphql/codegen/graphql'
import { can } from '@/lib/access'
import { ProjectCard } from './components/ProjectCard'
import { ProjectDialog } from './components/ProjectDialog'
import { PROJECT_LIST } from './operations'

/** The implementation projects the signed-in person belongs to, as cards (US5, FR-016). */
export function ProjectsPage() {
  const { access } = useRouteContext({ from: '/_protected' })
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [sort, setSort] = useState<ProjectsSort>('RECENT')
  const { data, loading, error } = useQuery(PROJECT_LIST, {
    variables: { page: 1, perPage: 100, sort },
    fetchPolicy: 'cache-and-network',
  })
  const rows = error ? [] : (data?.projects.data ?? [])
  return (
    <>
      <PageHeader
        title="Projects"
        description="Hospital information system implementations and where each one stands."
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="projects-sort">Sort by</Label>
          <NativeSelect
            id="projects-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as ProjectsSort)}
            className="min-w-44"
          >
            <option value="RECENT">Recent activity</option>
            <option value="GO_LIVE">Go-live date</option>
          </NativeSelect>
        </div>
        {can(access, 'projects', 'add') ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            New project
          </Button>
        ) : null}
      </div>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No projects yet. Create one to start from the standard lifecycle.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Projects">
          {rows.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      )}
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
