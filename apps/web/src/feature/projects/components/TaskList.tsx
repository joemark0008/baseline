import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { useMemo, useState, type Ref } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { makeAnnouncements, screenReaderInstructions } from '../dnd/announcements'
import { containerOf, previewMove, resolveDrop, type Containers } from '../dnd/resolve-drop'
import { prefersReducedMotion, useWorkSensors } from '../dnd/sensors'
import type { MoveRequest } from '../dnd/use-optimistic-moves'
import {
  groupByPhase,
  neighboursFor,
  type PhaseData,
  type Person,
  type TaskData,
  type WorkSort,
} from '../lib'
import { QuickAddRow } from './QuickAddRow'
import { phaseOfGroup, TaskListGroup } from './TaskListGroup'
import { TaskListRow, type InlineTaskPatch } from './TaskListRow'

export interface TaskListProps {
  projectId: string
  tasks: TaskData[]
  phases: ReadonlyArray<PhaseData>
  members: ReadonlyArray<Person>
  canEdit: boolean
  sort: WorkSort
  onMove: (request: MoveRequest) => void
  onOpen: (taskId: string) => void
  onInlineChange: (taskId: string, patch: InlineTaskPatch) => void
  onResetSort: () => void
  /** Receives the first visible quick-add input, for the `n` shortcut. */
  quickAddRef?: Ref<HTMLInputElement>
}

const groupsOf = (
  tasks: TaskData[],
  phases: ReadonlyArray<PhaseData>,
  sort: WorkSort,
): Containers =>
  Object.fromEntries(
    groupByPhase(tasks, phases, sort).map((g) => [g.phase.id, g.tasks.map((t) => t.id)]),
  )

/** The List (US2): tasks grouped by phase, drag between groups, inline edits, quick-add per phase. */
export function TaskList({
  projectId,
  tasks,
  phases,
  members,
  canEdit,
  sort,
  onMove,
  onOpen,
  onInlineChange,
  onResetSort,
  quickAddRef,
}: TaskListProps) {
  const sensors = useWorkSensors()
  const ordered = useMemo(() => [...phases].sort((a, b) => a.order - b.order), [phases])
  const source = useMemo(() => groupsOf(tasks, ordered, sort), [tasks, ordered, sort])
  const [preview, setPreview] = useState<Containers | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const groups = preview ?? source
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const phaseName = useMemo(() => new Map(ordered.map((p) => [p.id, p.name])), [ordered])
  const sortable = canEdit && sort === 'manual'
  const phaseAt = (id: UniqueIdentifier) => containerOf(groups, id, phaseOfGroup)

  const announcements = useMemo(
    () =>
      makeAnnouncements(
        (id) => {
          const task = byId.get(String(id))
          const phase = containerOf(groups, id, phaseOfGroup)
          if (!task || !phase) return null
          const ids = groups[phase]
          return {
            title: task.title,
            container: phaseName.get(phase) ?? 'phase',
            index: ids.indexOf(task.id) + 1,
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
      ),
    [byId, groups, phaseName],
  )

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
    setPreview(source)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const from = phaseAt(active.id)
    const to = phaseAt(over.id)
    if (!from || !to || from === to) return
    setPreview((prev) =>
      previewMove(prev ?? source, String(active.id), from, to, over.id, phaseOfGroup),
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id)
    const drop = resolveDrop(groups, source, id, over?.id ?? null, phaseOfGroup)
    setActiveId(null)
    setPreview(null)
    if (!drop) return
    const request: MoveRequest = { id, ...drop.neighbours }
    if (drop.container !== containerOf(source, id, phaseOfGroup)) request.phaseId = drop.container
    onMove(request)
  }

  function onDragCancel() {
    setActiveId(null)
    setPreview(null)
  }

  const moveToPhase = (task: TaskData, phaseId: string) =>
    onMove({ id: task.id, phaseId, ...neighboursFor(source[phaseId] ?? [], task.id, null) })
  const moveStep = (task: TaskData, direction: -1 | 1) => {
    const ids = source[task.phaseId] ?? []
    const idx = ids.indexOf(task.id)
    const swapWith = ids[idx + direction]
    if (!swapWith) return
    onMove({ id: task.id, ...neighboursFor(ids, task.id, swapWith) })
  }

  const active = activeId ? byId.get(activeId) : null
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {canEdit && sort !== 'manual' ? (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Rows follow the {sort === 'due' ? 'due date' : 'title'} order. Reordering by drag
              needs manual order.
            </span>
            <Button size="sm" variant="outline" onClick={onResetSort}>
              Use manual order
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-4" aria-label="Tasks by phase">
        {ordered.map((phase, phaseIndex) => {
          const ids = groups[phase.id] ?? []
          const ref = phaseIndex === 0 ? quickAddRef : undefined
          return (
            <TaskListGroup
              key={phase.id}
              phase={phase}
              taskIds={ids}
              footer={
                canEdit ? (
                  <QuickAddRow
                    projectId={projectId}
                    phaseId={phase.id}
                    phaseName={phase.name}
                    inputRef={ref}
                  />
                ) : null
              }
            >
              {ids.map((id, index) => {
                const task = byId.get(id)
                if (!task) return null
                return (
                  <TaskListRow
                    key={id}
                    task={task}
                    members={members}
                    otherPhases={ordered.filter((p) => p.id !== task.phaseId)}
                    canEdit={canEdit}
                    sortable={sortable}
                    isFirst={index === 0}
                    isLast={index === ids.length - 1}
                    onOpen={onOpen}
                    onInlineChange={onInlineChange}
                    onMoveToPhase={moveToPhase}
                    onMoveStep={moveStep}
                  />
                )
              })}
            </TaskListGroup>
          )
        })}
      </div>
      <DragOverlay dropAnimation={prefersReducedMotion() ? null : undefined}>
        {active ? (
          <div className="rounded-md border bg-card px-3 py-2 text-sm font-medium shadow-lg">
            {active.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
