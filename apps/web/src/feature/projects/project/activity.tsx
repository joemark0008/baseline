import { useQuery } from '@apollo/client/react'
import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, initials } from '../lib'
import { PROJECT_ACTIVITY } from '../operations'
import { useProject } from './context'

/** FR-013: who changed what and when, newest first. */
export function ProjectActivityTab() {
  const { project } = useProject()
  const [page, setPage] = useState(1)
  const { data, loading, error } = useQuery(PROJECT_ACTIVITY, {
    variables: { projectId: project.id, page, perPage: 50 },
    fetchPolicy: 'cache-and-network',
  })
  const rows = error ? [] : (data?.projectActivity.data ?? [])
  const meta = data?.projectActivity.meta
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Every material change, attributed and timestamped.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        ) : loading && !data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
        ) : (
          <ol className="divide-y">
            {rows.map((a) => (
              <li key={a.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar size="sm" aria-label={a.actor?.name ?? 'System'}>
                  <AvatarFallback>{a.actor ? initials(a.actor.name) : '—'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{a.actor?.name ?? 'System'}</span>{' '}
                    <span className="text-muted-foreground">{a.summary}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {meta && meta.lastPage > 1 ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {meta.currentPage} of {meta.lastPage}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!meta.hasPrevPage}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!meta.hasNextPage}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
