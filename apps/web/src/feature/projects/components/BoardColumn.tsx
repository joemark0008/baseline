import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { label, TASK_STATUSES, type TaskData } from '../lib'

export const columnId = (status: TaskData['status']) => `column:${status}`
export const statusOfColumn = (id: string | number): TaskData['status'] | null =>
  typeof id === 'string' && id.startsWith('column:') ? (id.slice(7) as TaskData['status']) : null

/** Feature 011 lanes: one cell per phase and status. */
export const cellId = (phaseId: string, status: TaskData['status']) => `cell:${phaseId}:${status}`
export const cellOf = (
  id: string | number,
): { phaseId: string; status: TaskData['status'] } | null => {
  if (typeof id !== 'string' || !id.startsWith('cell:')) return null
  const sep = id.lastIndexOf(':')
  const status = id.slice(sep + 1) as TaskData['status']
  if (!(TASK_STATUSES as ReadonlyArray<string>).includes(status)) return null
  return { phaseId: id.slice(5, sep), status }
}

export interface BoardColumnProps {
  status: TaskData['status']
  taskIds: string[]
  /** Lanes mode: the phase this cell belongs to; the container id changes with it. */
  phaseId?: string
  /** Feature 011: all tasks in this status, shown as "matching of total" while filtering. */
  total?: number
  filtered?: boolean
  /** Feature 011 FR-002: completed tasks this column leaves out (Complete column only). */
  hiddenDone?: number
  onShowDone?: () => void
  /** A folded lane: the header only, still a drop target. */
  compact?: boolean
  children?: ReactNode
}

/** A status column: a droppable area holding a vertical sortable list of cards. */
export function BoardColumn({
  status,
  taskIds,
  phaseId,
  total,
  filtered = false,
  hiddenDone = 0,
  onShowDone,
  compact = false,
  children,
}: BoardColumnProps) {
  const id = phaseId ? cellId(phaseId, status) : columnId(status)
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column', status, phaseId } })
  const heading = `${phaseId ? `${phaseId}-` : ''}${status.toLowerCase()}-heading`
  const count = filtered && total !== undefined ? `${taskIds.length} of ${total}` : taskIds.length
  const countLabel = `${count} tasks`
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={heading}
      className={`flex shrink-0 snap-start flex-col gap-3 rounded-xl border bg-muted/30 motion-safe:transition-colors ${
        compact ? 'min-w-28 flex-1 px-3 py-2' : 'w-72 p-3'
      } ${isOver ? 'border-primary ring-2 ring-primary/30' : ''}`}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 id={heading} className={compact ? 'text-xs font-medium' : 'text-sm font-semibold'}>
          {label(status)}
        </h3>
        <Badge variant="secondary" aria-label={countLabel}>
          {count}
        </Badge>
      </header>
      {hiddenDone > 0 ? (
        <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{hiddenDone} done hidden</span>
          {onShowDone ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={onShowDone}
            >
              Show done
            </Button>
          ) : null}
        </p>
      ) : null}
      <SortableContext id={id} items={taskIds} strategy={verticalListSortingStrategy}>
        {compact ? null : (
          <ol
            className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto"
            aria-label={`${label(status)} tasks`}
          >
            {children}
          </ol>
        )}
      </SortableContext>
    </section>
  )
}
