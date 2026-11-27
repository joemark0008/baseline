import { useMutation } from '@apollo/client/react'
import {
  closestCorners,
  DndContext,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DeliverableDialog } from '../components/DeliverableDialog'
import { DeliverableRow } from '../components/DeliverableRow'
import { ReviewDialog } from '../components/ReviewDialog'
import { makeAnnouncements, screenReaderInstructions } from '../dnd/announcements'
import { containerOf, previewMove, resolveDrop, type Containers } from '../dnd/resolve-drop'
import { useWorkSensors } from '../dnd/sensors'
import { message, neighboursFor, type DeliverableData } from '../lib'
import { MOVE_PROJECT_DELIVERABLE, PROJECT, REMOVE_PROJECT_DELIVERABLE } from '../operations'
import { useProject } from './context'

const groupId = (phaseId: string) => `dphase:${phaseId}`
const phaseOfGroup = (id: UniqueIdentifier): string | null =>
  typeof id === 'string' && id.startsWith('dphase:') ? id.slice(7) : null

/** FR-015 to FR-017, plus US4: deliverables per phase, reordered and re-phased by drag or menu. */
export function ProjectReadinessTab() {
  const { project } = useProject()
  const phases = useMemo(
    () => [...project.phases].sort((a, b) => a.order - b.order),
    [project.phases],
  )
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
  const [moveDeliverable] = useMutation(MOVE_PROJECT_DELIVERABLE, { refetchQueries: [PROJECT] })
  const sensors = useWorkSensors()
  const source = useMemo<Containers>(
    () =>
      Object.fromEntries(
        phases.map((p) => [
          p.id,
          [...p.deliverables].sort((a, b) => a.order - b.order).map((d) => d.id),
        ]),
      ),
    [phases],
  )
  const [preview, setPreview] = useState<Containers | null>(null)
  const groups = preview ?? source
  const byId = useMemo(
    () => new Map(phases.flatMap((p) => p.deliverables).map((d) => [d.id, d])),
    [phases],
  )
  const phaseName = useMemo(() => new Map(phases.map((p) => [p.id, p.name])), [phases])
  const announcements = useMemo(
    () =>
      makeAnnouncements(
        (id) => {
          const d = byId.get(String(id))
          const phase = containerOf(groups, id, phaseOfGroup)
          if (!d || !phase) return null
          const ids = groups[phase]
          return {
            title: d.title,
            container: phaseName.get(phase) ?? 'phase',
            index: ids.indexOf(d.id) + 1,
            count: ids.length,
          }
        },
        (id) => {
          const phase = containerOf(groups, id, phaseOfGroup)
          if (!phase) return null
          const ids = groups[phase]
          const index = phaseOfGroup(id) !== null ? ids.length : ids.indexOf(String(id)) + 1
          return {
            container: phaseName.get(phase) ?? 'phase',
            index: Math.max(1, index),
            count: Math.max(1, ids.length),
          }
        },
        'deliverable',
      ),
    [byId, groups, phaseName],
  )

  async function save(input: {
    id: string
    phaseId?: string
    afterId?: string
    beforeId?: string
  }) {
    try {
      await moveDeliverable({ variables: { input } })
    } catch (e) {
      toast.error(message(e))
    }
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const from = containerOf(groups, active.id, phaseOfGroup)
    const to = containerOf(groups, over.id, phaseOfGroup)
    if (!from || !to || from === to) return
    setPreview((prev) =>
      previewMove(prev ?? source, String(active.id), from, to, over.id, phaseOfGroup),
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id)
    const drop = resolveDrop(groups, source, id, over?.id ?? null, phaseOfGroup)
    setPreview(null)
    if (!drop) return
    const from = containerOf(source, id, phaseOfGroup)
    void save({
      id,
      ...(drop.container !== from ? { phaseId: drop.container } : {}),
      afterId: drop.neighbours.afterTaskId,
      beforeId: drop.neighbours.beforeTaskId,
    })
  }

  const moveToPhase = (d: DeliverableData, phaseId: string) => {
    const n = neighboursFor(source[phaseId] ?? [], d.id, null)
    void save({ id: d.id, phaseId, afterId: n.afterTaskId })
  }
  const moveStep = (d: DeliverableData, direction: -1 | 1) => {
    const ids = source[d.phaseId] ?? []
    const swapWith = ids[ids.indexOf(d.id) + direction]
    if (!swapWith) return
    const n = neighboursFor(ids, d.id, swapWith)
    void save({ id: d.id, afterId: n.afterTaskId, beforeId: n.beforeTaskId })
  }

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
              they stand. Drag a row to reorder it or move it to another phase. This planner tracks
              readiness; it holds no patient records.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {ready} of {total} ready
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            accessibility={{ announcements, screenReaderInstructions }}
            onDragStart={() => setPreview(source)}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => setPreview(null)}
          >
            {phases.map((phase) => {
              const ids = groups[phase.id] ?? []
              return (
                <PhaseSection
                  key={phase.id}
                  phaseId={phase.id}
                  name={phase.name}
                  onAdd={() => setAdding(phase.id)}
                >
                  {ids.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No deliverables in this phase yet.
                    </p>
                  ) : (
                    <SortableContext
                      id={groupId(phase.id)}
                      items={ids}
                      strategy={verticalListSortingStrategy}
                    >
                      <Table aria-label={`${phase.name} deliverables`}>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <span className="sr-only">Reorder</span>
                            </TableHead>
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
                          {ids.map((id, index) => {
                            const d = byId.get(id)
                            if (!d) return null
                            return (
                              <DeliverableRow
                                key={id}
                                deliverable={d}
                                otherPhases={phases.filter((p) => p.id !== d.phaseId)}
                                canEdit={project.can.edit}
                                isFirst={index === 0}
                                isLast={index === ids.length - 1}
                                onEdit={setEditing}
                                onReview={setReviewing}
                                onRemove={setRemoving}
                                onMoveToPhase={moveToPhase}
                                onMoveStep={moveStep}
                              />
                            )
                          })}
                        </TableBody>
                      </Table>
                    </SortableContext>
                  )}
                </PhaseSection>
              )
            })}
          </DndContext>
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

/** A phase's deliverables: a droppable section so rows can be dragged in from another phase. */
function PhaseSection({
  phaseId,
  name,
  onAdd,
  children,
}: {
  phaseId: string
  name: string
  onAdd: () => void
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: groupId(phaseId),
    data: { type: 'phase', phaseId },
  })
  return (
    <section
      ref={setNodeRef}
      aria-label={name}
      className={`flex flex-col gap-2 rounded-lg motion-safe:transition-colors ${isOver ? 'ring-2 ring-primary/30' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{name}</h3>
        <Button size="sm" variant="outline" onClick={onAdd}>
          Add deliverable
        </Button>
      </div>
      {children}
    </section>
  )
}
