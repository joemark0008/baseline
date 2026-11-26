import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { previewProject, type ReadinessStatus } from '../fixture'

const statusLabel: Record<ReadinessStatus, string> = {
  ready: 'Ready',
  in_review: 'In review',
  needs_work: 'Needs attention',
  not_started: 'Not started',
}

function StatusBadge({ status }: { status: ReadinessStatus }) {
  if (status === 'ready') return <Badge variant="secondary">{statusLabel[status]}</Badge>
  if (status === 'in_review') return <Badge>{statusLabel[status]}</Badge>
  if (status === 'needs_work') {
    return (
      <Badge className="border-destructive/20 bg-destructive/10 text-destructive">
        {statusLabel[status]}
      </Badge>
    )
  }
  return <Badge variant="outline">{statusLabel[status]}</Badge>
}

function formatDate(date?: string) {
  if (!date) return 'Not scheduled'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(`${date}T00:00:00`),
  )
}

export function DataReadiness() {
  const phases = new Map(previewProject.phases.map((phase) => [phase.id, phase.name]))
  const team = new Map(previewProject.team.map((member) => [member.id, member]))
  const readyCount = previewProject.deliverables.filter((item) => item.status === 'ready').length

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Data readiness</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track preparation and review of implementation inputs. No patient records are included.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Master data & deliverables</h3>
            <CardDescription className="mt-1">
              Readiness checkpoints across project phases
            </CardDescription>
          </div>
          <Badge variant="outline">
            {readyCount} of {previewProject.deliverables.length} ready
          </Badge>
        </CardHeader>
        <CardContent>
          <Table aria-label="Data readiness deliverables">
            <TableHeader>
              <TableRow>
                <TableHead>Deliverable</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Review due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewProject.deliverables.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="min-w-56 font-medium">{item.title}</TableCell>
                  <TableCell className="min-w-40 text-muted-foreground">
                    {phases.get(item.phaseId)}
                  </TableCell>
                  <TableCell className="min-w-36">
                    {team.get(item.ownerId)?.name ?? 'Unassigned'}
                  </TableCell>
                  <TableCell className="min-w-36 text-muted-foreground">
                    {formatDate(item.dueDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Sample data only. Track readiness here; do not upload or enter identifiable patient health
        information.
      </p>
    </div>
  )
}
