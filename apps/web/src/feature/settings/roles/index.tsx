import { useQuery } from '@apollo/client/react'
import { Link, useRouteContext } from '@tanstack/react-router'
import { QueryStateRow } from '@/components/QueryStateRow'
import { Badge } from '@/components/ui/badge'
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
import { can } from '@/lib/access'
import { ROLES } from './operations'

export function RolesPage() {
  const { access } = useRouteContext({ from: '/_protected' })
  const { data, loading, error } = useQuery(ROLES, { fetchPolicy: 'cache-and-network' })
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Each person has one role. A role is a grid of features and what it may do with each.
          </CardDescription>
        </div>
        {can(access, 'roles', 'add') ? (
          <Button asChild size="sm">
            <Link to="/settings/roles/new">New role</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">People</TableHead>
              <TableHead className="text-right">Pending invites</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <QueryStateRow
              colSpan={4}
              loading={loading && !data}
              error={error?.message ?? null}
              isEmpty={data?.roles.length === 0}
              emptyMessage="No roles yet."
            />
            {(error ? [] : (data?.roles ?? [])).map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link
                    to="/settings/roles/$id"
                    params={{ id: r.id }}
                    className="font-medium hover:underline"
                  >
                    {r.name}
                  </Link>
                  {r.kind !== 'CUSTOM' ? (
                    <Badge variant="outline" className="ml-2">
                      Built-in
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.description}</TableCell>
                <TableCell className="text-right">{r.memberCount}</TableCell>
                <TableCell className="text-right">{r.pendingInviteCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
