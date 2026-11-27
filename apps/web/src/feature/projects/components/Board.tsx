import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { makeAnnouncements, screenReaderInstructions } from '../dnd/announcements'
import { prefersReducedMotion, useWorkSensors } from '../dnd/sensors'
import { containerOf, previewMove, resolveDrop } from '../dnd/resolve-drop'
import type { MoveRequest } from '../dnd/use-optimistic-moves'
import {
  columnsByStatus,
  label,
  neighboursFor,
  TASK_STATUSES,
  type PhaseData,
  type TaskData,
} from '../lib'
import { BoardCard, BoardCardBody } from './BoardCard'
import { BoardColumn, columnId, statusOfColumn } from './BoardColumn'

export interface BoardProps {
  tasks: TaskData[]
  phases: ReadonlyArray<PhaseData>
  canEdit: boolean
  onMove: (request: MoveRequest) => void
  onOpen: (taskId: string) => void
}

type Columns = Record<TaskData['status'], string[]>

const columnsOf = (tasks: TaskData[]): Columns =>
  Object.fromEntries(
    columnsByStatus(tasks).map((c) => [c.status, c.tasks.map((t) => t.id)]),
  ) as Columns

const statusAt = (columns: Columns, id: UniqueIdentifier): TaskData['status'] | null =>
  containerOf(columns, id, statusOfColumn) as TaskData['status'] | null

/** The status board (US1): columns by status, cards in manual order, moves by drag, keyboard or menu. */
export function Board({ tasks, phases, canEdit, onMove, onOpen }: BoardProps) {
  const sensors = useWorkSensors()
  const source = useMemo(() => columnsOf(tasks), [tasks])
  // While a card is dragged across columns the preview order lives here; otherwise the data is shown as is.
  const [preview, setPreview] = useState<Columns | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const columns = preview ?? source
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const phaseName = useMemo(() => new Map(phases.map((p) => [p.id, p.name])), [phases])

  const announcements = useMemo(
    () =>
      makeAnnouncements(
        (id) => {
          const task = byId.get(String(id))
          const status = statusAt(columns, id)
          if (!task || !status) return null
          const ids = columns[status]
          return {
            title: task.title,
            container: label(status),
            index: ids.indexOf(task.id) + 1,
            count: ids.length,
          }
        },
        (id) => {
          const status = statusAt(columns, id)
          if (!status) return null
          const ids = columns[status]
          const index = statusOfColumn(id) !== null ? ids.length : ids.indexOf(String(id)) + 1
          return {
            container: label(status),
            index: Math.max(1, index),
            count: Math.max(1, ids.length),
          }
        },
      ),
    [byId, columns],
  )

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
    setPreview(source)
  }

  /** Live preview: move the card into the column under the pointer, at the hovered index. */
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const from = statusAt(columns, active.id)
    const to = statusAt(columns, over.id)
    if (!from || !to || from === to) return
    setPreview(
      (prev) =>
        previewMove(
          prev ?? source,
          String(active.id),
          from,
          to,
          over.id,
          statusOfColumn,
        ) as Columns,
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id)
    const drop = resolveDrop(columns, source, id, over?.id ?? null, statusOfColumn)
    setActiveId(null)
    setPreview(null)
    if (!drop) return
    const request: MoveRequest = { id, ...drop.neighbours }
    if (drop.container !== statusAt(source, id))
      request.status = drop.container as TaskData['status']
    onMove(request)
  }

  function onDragCancel() {
    setActiveId(null)
    setPreview(null)
  }

  const moveTo = (task: TaskData, status: TaskData['status']) =>
    onMove({ id: task.id, status, ...neighboursFor(source[status], task.id, null) })
  const moveStep = (task: TaskData, direction: -1 | 1) => {
    const ids = source[task.status]
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
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2" aria-label="Task board">
        {TASK_STATUSES.map((status) => (
          <BoardColumn key={status} status={status} taskIds={columns[status]}>
            {columns[status].map((id, index) => {
              const task = byId.get(id)
              if (!task) return null
              return (
                <BoardCard
                  key={id}
                  task={task}
                  phaseName={phaseName.get(task.phaseId) ?? 'Phase'}
                  canEdit={canEdit}
                  onOpen={onOpen}
                  onMoveTo={moveTo}
                  onMoveStep={moveStep}
                  isFirst={index === 0}
                  isLast={index === columns[status].length - 1}
                />
              )
            })}
          </BoardColumn>
        ))}
      </div>
      <DragOverlay dropAnimation={prefersReducedMotion() ? null : undefined}>
        {active ? (
          <div className="flex w-72 rounded-lg border bg-card p-3 shadow-lg">
            <BoardCardBody task={active} phaseName={phaseName.get(active.phaseId) ?? 'Phase'} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export { columnId }
