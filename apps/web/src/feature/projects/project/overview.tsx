import { useMutation } from '@apollo/client/react'
import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PhaseDialog } from '../components/PhaseDialog'
import { PhaseRow } from '../components/PhaseRow'
import { OverdueBadge, StatusBadge } from '../components/StatusBadge'
import { makeAnnouncements, screenReaderInstructions } from '../dnd/announcements'
import { useWorkSensors } from '../dnd/sensors'
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

  const sensors = useWorkSensors()
  const ids = useMemo(() => phases.map((p) => p.id), [phases])
  const announcements = useMemo(
    () =>
      makeAnnouncements(
        (id) => {
          const i = ids.indexOf(String(id))
          return i === -1
            ? null
            : { title: phases[i].name, container: 'the plan', index: i + 1, count: ids.length }
        },
        (id) => {
          const i = ids.indexOf(String(id))
          return i === -1 ? null : { container: 'the plan', index: i + 1, count: ids.length }
        },
        'phase',
      ),
    [ids, phases],
  )

  async function save(order: string[]) {
    try {
      await reorder({ variables: { projectId: project.id, phaseIds: order } })
    } catch (e) {
      toast.error(message(e))
    }
  }

  function moveStep(phase: PhaseData, delta: -1 | 1) {
    const index = ids.indexOf(phase.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    void save(arrayMove(ids, index, target))
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    void save(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            accessibility={{ announcements, screenReaderInstructions }}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ol aria-label="Implementation phases" className="divide-y">
                {phases.map((phase, index) => (
                  <PhaseRow
                    key={phase.id}
                    phase={phase}
                    index={index}
                    count={phases.length}
                    canManage={project.can.manage}
                    onEdit={setEditing}
                    onRemove={setRemoving}
                    onMoveStep={moveStep}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
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
              No dated open tasks. Add tasks on the List or Board.
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
