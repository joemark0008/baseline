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
import { containerOf, previewMove, resolveDrop, type Containers } from '../dnd/resolve-drop'
import { prefersReducedMotion, useWorkSensors } from '../dnd/sensors'
import type { MoveRequest } from '../dnd/use-optimistic-moves'
import {
  label,
  neighboursFor,
  orderByPosition,
  phasesInOrder,
  TASK_STATUSES,
  type PhaseData,
  type TaskData,
} from '../lib'
import type { Folding } from '../readability'
import type { BoardLayout } from '../view-preferences'
import { BoardCard, BoardCardBody } from './BoardCard'
import { BoardColumn, cellId, cellOf, columnId, statusOfColumn } from './BoardColumn'
import { BoardLane, type LaneCounts } from './BoardLane'

export interface BoardProps {
  /** The tasks to draw (after filters). */
  tasks: TaskData[]
  /** Every task of the project, so drops resolve against the full manual order (feature 011). */
  allTasks?: TaskData[]
  /** The phases to show as lanes (plan order is applied here) and to name cards by. */
  phases: ReadonlyArray<PhaseData>
  canEdit: boolean
  /** Feature 011 FR-016: plain status columns, or one lane per phase. */
  layout?: BoardLayout
  folding?: Folding
  filtered?: boolean
  hiddenDone?: number
  onShowDone?: () => void
  onMove: (request: MoveRequest) => void
  onOpen: (taskId: string) => void
}

/** A container is a status column or, in lanes mode, a phase-and-status cell. */
interface Cell {
  phaseId: string | null
  status: TaskData['status']
}
const keyOf = (cell: Cell) =>
  cell.phaseId ? cellId(cell.phaseId, cell.status) : columnId(cell.status)
const cellOfKey = (id: UniqueIdentifier): Cell | null => {
  const cell = cellOf(id)
  if (cell) return cell
  const status = statusOfColumn(id)
  return status ? { phaseId: null, status } : null
}
const isContainer = (id: UniqueIdentifier) => (cellOfKey(id) ? String(id) : null)

const containersOf = (
  tasks: TaskData[],
  lanes: boolean,
  phases: ReadonlyArray<PhaseData>,
): Containers => {
  const ordered = orderByPosition(tasks)
  const out: Containers = {}
  const keys: Cell[] = lanes
    ? phases.flatMap((p) => TASK_STATUSES.map((status) => ({ phaseId: p.id, status })))
    : TASK_STATUSES.map((status) => ({ phaseId: null, status }))
  for (const cell of keys) out[keyOf(cell)] = []
  for (const t of ordered) {
    const key = keyOf({ phaseId: lanes ? t.phaseId : null, status: t.status })
    ;(out[key] ??= []).push(t.id)
  }
  return out
}

/**
 * The status board (US1 of 010, US4 of 011): columns by status, or lanes by phase crossing those
 * columns; cards in manual order; moves by drag, keyboard or menu.
 */
export function Board({
  tasks,
  allTasks,
  phases,
  canEdit,
  layout = 'columns',
  folding,
  filtered = false,
  hiddenDone = 0,
  onShowDone,
  onMove,
  onOpen,
}: BoardProps) {
  const sensors = useWorkSensors()
  const lanes = layout === 'lanes'
  const ordered = useMemo(() => phasesInOrder(phases), [phases])
  const everything = allTasks ?? tasks
  // Drops resolve against the full order; hidden tasks keep their place (research.md › Decision 6).
  const source = useMemo(
    () => containersOf(everything, lanes, ordered),
    [everything, lanes, ordered],
  )
  const shown = useMemo(() => containersOf(tasks, lanes, ordered), [tasks, lanes, ordered])
  // While a card is dragged across containers the preview order lives here; otherwise the data is shown as is.
  const [preview, setPreview] = useState<Containers | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const containers = preview ?? shown
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const phaseName = useMemo(() => new Map(phases.map((p) => [p.id, p.name])), [phases])
  const cellOfTask = (task: TaskData): Cell => ({
    phaseId: lanes ? task.phaseId : null,
    status: task.status,
  })
  const describe = (cell: Cell) =>
    cell.phaseId
      ? `${label(cell.status)} in ${phaseName.get(cell.phaseId) ?? 'phase'}`
      : label(cell.status)

  const announcements = useMemo(
    () =>
      makeAnnouncements(
        (id) => {
          const task = byId.get(String(id))
          const key = containerOf(containers, id, isContainer)
          const cell = key ? cellOfKey(key) : null
          if (!task || !key || !cell) return null
          const ids = containers[key]
          return {
            title: task.title,
            container: describe(cell),
            index: ids.indexOf(task.id) + 1,
            count: ids.length,
          }
        },
        (id) => {
          const key = containerOf(containers, id, isContainer)
          const cell = key ? cellOfKey(key) : null
          if (!key || !cell) return null
          const ids = containers[key]
          const index = isContainer(id) !== null ? ids.length : ids.indexOf(String(id)) + 1
          return {
            container: describe(cell),
            index: Math.max(1, index),
            count: Math.max(1, ids.length),
          }
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- describe closes over phaseName and lanes only
    [byId, containers, phaseName, lanes],
  )

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
    setPreview(shown)
  }

  /** Live preview: move the card into the container under the pointer, at the hovered index. */
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const from = containerOf(containers, active.id, isContainer)
    const to = containerOf(containers, over.id, isContainer)
    if (!from || !to || from === to) return
    setPreview((prev) =>
      previewMove(prev ?? shown, String(active.id), from, to, over.id, isContainer),
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id)
    const drop = resolveDrop(containers, source, id, over?.id ?? null, isContainer, {
      full: source,
    })
    setActiveId(null)
    setPreview(null)
    if (!drop) return
    const target = cellOfKey(drop.container)
    const task = byId.get(id)
    if (!target || !task) return
    const request: MoveRequest = { id, ...drop.neighbours }
    if (target.status !== task.status) request.status = target.status
    if (target.phaseId && target.phaseId !== task.phaseId) request.phaseId = target.phaseId
    onMove(request)
  }

  function onDragCancel() {
    setActiveId(null)
    setPreview(null)
  }

  const moveTo = (task: TaskData, status: TaskData['status']) => {
    const key = keyOf({ ...cellOfTask(task), status })
    onMove({ id: task.id, status, ...neighboursFor(source[key] ?? [], task.id, null) })
  }
  const moveToPhase = (task: TaskData, phaseId: string) => {
    const key = keyOf({ phaseId, status: task.status })
    onMove({ id: task.id, phaseId, ...neighboursFor(source[key] ?? [], task.id, null) })
  }
  const moveStep = (task: TaskData, direction: -1 | 1) => {
    const key = keyOf(cellOfTask(task))
    const visible = shown[key] ?? []
    const swapWith = visible[visible.indexOf(task.id) + direction]
    if (!swapWith) return
    onMove({ id: task.id, ...neighboursFor(source[key] ?? [], task.id, swapWith) })
  }

  const renderCell = (cell: Cell, compact = false) => {
    const key = keyOf(cell)
    const ids = containers[key] ?? []
    const all = source[key] ?? []
    const hidden =
      cell.status === 'COMPLETE'
        ? lanes
          ? all.filter((id) => !ids.includes(id)).length
          : hiddenDone
        : 0
    return (
      <BoardColumn
        key={key}
        status={cell.status}
        phaseId={cell.phaseId ?? undefined}
        taskIds={ids}
        total={all.length}
        filtered={filtered}
        hiddenDone={hidden}
        onShowDone={onShowDone}
        compact={compact}
      >
        {compact
          ? null
          : ids.map((id, index) => {
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
                  otherPhases={lanes ? ordered.filter((p) => p.id !== task.phaseId) : undefined}
                  onMoveToPhase={lanes ? moveToPhase : undefined}
                  isFirst={index === 0}
                  isLast={index === ids.length - 1}
                />
              )
            })}
      </BoardColumn>
    )
  }

  const laneCounts = (phase: PhaseData): LaneCounts => {
    const inLane = tasks.filter((t) => t.phaseId === phase.id)
    const allInLane = everything.filter((t) => t.phaseId === phase.id)
    return {
      open: inLane.filter((t) => t.status !== 'COMPLETE').length,
      overdue: inLane.filter((t) => t.overdue).length,
      done: allInLane.filter((t) => t.status === 'COMPLETE').length,
      matching: inLane.length,
      total: allInLane.length,
    }
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
      {lanes ? (
        <div className="flex flex-col gap-6" aria-label="Task board by phase">
          {ordered.map((phase) => {
            const collapsed = folding?.isCollapsed(phase.id) ?? false
            return (
              <BoardLane
                key={phase.id}
                phase={phase}
                collapsed={collapsed}
                counts={laneCounts(phase)}
                filtered={filtered}
                onToggle={folding?.toggle}
              >
                {TASK_STATUSES.map((status) =>
                  renderCell({ phaseId: phase.id, status }, collapsed),
                )}
              </BoardLane>
            )
          })}
        </div>
      ) : (
        <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2" aria-label="Task board">
          {TASK_STATUSES.map((status) => renderCell({ phaseId: null, status }))}
        </div>
      )}
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
