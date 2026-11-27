import { useMutation } from '@apollo/client/react'
import { ArrowDown, ArrowUp, MoreHorizontal } from 'lucide-react'
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
import { PhaseDialog } from '../components/PhaseDialog'
import { OverdueBadge, StatusBadge } from '../components/StatusBadge'
import { allTasks, formatDate, message, type PhaseData } from '../lib'
import { PROJECT, REMOVE_PROJECT_PHASE, REORDER_PROJECT_PHASES } from '../operations'
import { useProject } from './context'

/** The lifecycle plan: phases in order, with owners, dates and status, plus what is due next. */
export function ProjectOverviewTab() {
  const { project } = useProject()
  const phases = [...project.phases].sort((a, b) => a.order - b.order)
  const members = project.members.map((m) => m.user)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<PhaseData | null>(null)
  const [removing, setRemoving] = useState<PhaseData | null>(null)
  const [reorder] = useMutation(REORDER_PROJECT_PHASES, { refetchQueries: [PROJECT] })
  const [removePhase] = useMutation(REMOVE_PROJECT_PHASE, { refetchQueries: [PROJECT] })
  const upcoming = allTasks(project)
    .filter((t) => t.status !== 'COMPLETE' && t.dueDate)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 5)

  async function move(index: number, delta: -1 | 1) {
    const ids = phases.map((p) => p.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      await reorder({ variables: { projectId: project.id, phaseIds: ids } })
    } catch (e) {
      toast.error(message(e))
    }
  }

  async function remove(): Promise<string | null> {
    if (!removing) return null
    try {
      await removePhase({ variables: { id: removing.id } })
    } catch (e) {
      return message(e)
    }
    toast.success(`${removing.name} removed`)
    return null
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Implementation phases</CardTitle>
            <CardDescription>
              {project.can.manage
                ? 'Rename, reorder, assign and date each phase for this project.'
                : 'The plan for this implementation, in order.'}
            </CardDescription>
          </div>
          {project.can.manage ? (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              Add phase
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <ol aria-label="Implementation phases" className="divide-y">
            {phases.map((phase, index) => {
              const open = phase.tasks.filter((t) => t.status !== 'COMPLETE').length
              const overdue = phase.tasks.filter((t) => t.overdue).length
              return (
                <li
                  key={phase.id}
                  className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{phase.name}</p>
                      <StatusBadge value={phase.status} />
                      {overdue ? <OverdueBadge /> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(phase.startDate, false)} – {formatDate(phase.endDate, false)} ·{' '}
                      {phase.owner ? phase.owner.name : 'No owner'} · {open} open task
                      {open === 1 ? '' : 's'} · {phase.deliverables.length} deliverable
                      {phase.deliverables.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  {project.can.manage ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Move ${phase.name} up`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Move ${phase.name} down`}
                        disabled={index === phases.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${phase.name}`}
                          >
                            <MoreHorizontal aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(phase)}>
                            Edit phase
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setRemoving(phase)}
                          >
                            Remove phase
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Due next</CardTitle>
            <CardDescription>The next open tasks across all phases.</CardDescription>
          </div>
          <Badge variant="outline">{upcoming.length} next</Badge>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No dated open tasks. Add tasks on the Tasks page.
            </p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {phases.find((p) => p.id === task.phaseId)?.name ?? 'Phase'} ·{' '}
                      {task.owner?.name ?? 'Unassigned'}
                    </p>
                  </div>
                  {task.overdue ? <OverdueBadge /> : <StatusBadge value={task.status} />}
                  <span className="text-sm text-muted-foreground">
                    {formatDate(task.dueDate, false)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {adding ? (
        <PhaseDialog open onOpenChange={setAdding} projectId={project.id} members={members} />
      ) : null}
      {editing ? (
        <PhaseDialog
          key={editing.id}
          open
          onOpenChange={(open) => (open ? null : setEditing(null))}
          projectId={project.id}
          members={members}
          phase={editing}
        />
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? null : setRemoving(null))}
        title={`Remove ${removing?.name ?? 'phase'}?`}
        description="Only an empty phase can be removed. Move its tasks and deliverables first."
        confirmLabel="Remove"
        onConfirm={remove}
      />
    </>
  )
}
