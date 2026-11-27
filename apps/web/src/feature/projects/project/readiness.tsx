import { useMutation } from '@apollo/client/react'
import { ExternalLink, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeliverableDialog } from '../components/DeliverableDialog'
import { ReviewDialog } from '../components/ReviewDialog'
import { StatusBadge } from '../components/StatusBadge'
import { formatDate, message, type DeliverableData } from '../lib'
import { PROJECT, REMOVE_PROJECT_DELIVERABLE } from '../operations'
import { useProject } from './context'

/** FR-015 to FR-017: deliverables and master-data readiness per phase, with review outcomes. */
export function ProjectReadinessTab() {
  const { project } = useProject()
  const phases = [...project.phases].sort((a, b) => a.order - b.order)
  const total = phases.reduce((n, p) => n + p.deliverables.length, 0)
  const ready = phases.reduce(
    (n, p) => n + p.deliverables.filter((d) => d.status === 'READY').length,
    0,
  )
  const [adding, setAdding] = useState<string | null>(null)
  const [editing, setEditing] = useState<DeliverableData | null>(null)
  const [reviewing, setReviewing] = useState<DeliverableData | null>(null)
  const [removing, setRemoving] = useState<DeliverableData | null>(null)
  const [remove] = useMutation(REMOVE_PROJECT_DELIVERABLE, { refetchQueries: [PROJECT] })

  async function confirmRemove(): Promise<string | null> {
    if (!removing) return null
    try {
      await remove({ variables: { id: removing.id } })
    } catch (e) {
      return message(e)
    }
    toast.success(`${removing.title} removed`)
    return null
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Data readiness and deliverables</CardTitle>
            <CardDescription>
              Phase outputs and master-data categories, who prepares and reviews them, and where
              they stand. This planner tracks readiness; it holds no patient records.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {ready} of {total} ready
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {phases.map((phase) => (
            <section key={phase.id} aria-label={phase.name} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{phase.name}</h3>
                <Button size="sm" variant="outline" onClick={() => setAdding(phase.id)}>
                  Add deliverable
                </Button>
              </div>
              {phase.deliverables.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deliverables in this phase yet.</p>
              ) : (
                <Table aria-label={`${phase.name} deliverables`}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deliverable</TableHead>
                      <TableHead>Kind</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phase.deliverables.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="min-w-56">
                          <p className="font-medium">{d.title}</p>
                          {d.links.length ? (
                            <p className="mt-1 flex flex-wrap gap-2 text-xs">
                              {d.links.map((l) => (
                                <a
                                  key={l.url}
                                  href={l.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
                                >
                                  <ExternalLink aria-hidden="true" className="size-3" />
                                  {l.label}
                                </a>
                              ))}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={d.kind} />
                        </TableCell>
                        <TableCell>{d.owner?.name ?? 'Unassigned'}</TableCell>
                        <TableCell>{d.reviewer?.name ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(d.dueDate)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={d.status} />
                        </TableCell>
                        <TableCell>
                          {d.reviewOutcome ? (
                            <span className="flex flex-col gap-1">
                              <StatusBadge value={d.reviewOutcome} />
                              {d.reviewNote ? (
                                <span className="text-xs text-muted-foreground">
                                  {d.reviewNote}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not reviewed</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${d.title}`}
                              >
                                <MoreHorizontal aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setEditing(d)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setReviewing(d)}>
                                Record review
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setRemoving(d)}
                              >
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          ))}
        </CardContent>
      </Card>
      {adding ? (
        <DeliverableDialog
          open
          onOpenChange={(open) => (open ? null : setAdding(null))}
          project={project}
          phaseId={adding}
        />
      ) : null}
      {editing ? (
        <DeliverableDialog
          key={editing.id}
          open
          onOpenChange={(open) => (open ? null : setEditing(null))}
          project={project}
          phaseId={editing.phaseId}
          deliverable={editing}
        />
      ) : null}
      {reviewing ? (
        <ReviewDialog
          deliverable={reviewing}
          onOpenChange={(open) => (open ? null : setReviewing(null))}
        />
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? null : setRemoving(null))}
        title={`Remove ${removing?.title ?? 'deliverable'}?`}
        description="The deliverable and its links are removed from this project."
        confirmLabel="Remove"
        onConfirm={confirmRemove}
      />
    </>
  )
}
