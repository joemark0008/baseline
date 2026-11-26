import { useQuery } from '@apollo/client/react'
import { useState } from 'react'
import { QueryStateRow } from '@/components/QueryStateRow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ACCESS_CHANGES } from './operations'

const PER_PAGE = 25

/** Every role and access change, newest first. */
export function AccessHistoryPage() {
  const [page, setPage] = useState(1)
  const { data, loading, error } = useQuery(ACCESS_CHANGES, {
    variables: { page, perPage: PER_PAGE },
    fetchPolicy: 'cache-and-network',
  })
  const meta = data?.accessChanges.meta
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Who changed a role or someone's access, and when.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">When</TableHead>
              <TableHead className="w-40">Who</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <QueryStateRow
              colSpan={3}
              loading={loading && !data}
              error={error?.message ?? null}
              isEmpty={data?.accessChanges.data.length === 0}
              emptyMessage="No changes yet."
            />
            {(error ? [] : (data?.accessChanges.data ?? [])).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {new Date(c.createdAt as string).toLocaleString()}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.actorName ?? '—'}</TableCell>
                <TableCell>{c.summary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {meta && meta.lastPage > 1 ? (
          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span>
              Page {meta.currentPage} of {meta.lastPage}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.hasNextPage}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
