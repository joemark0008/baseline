import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { label, type TaskData } from '../lib'

export const columnId = (status: TaskData['status']) => `column:${status}`
export const statusOfColumn = (id: string | number): TaskData['status'] | null =>
  typeof id === 'string' && id.startsWith('column:') ? (id.slice(7) as TaskData['status']) : null

export interface BoardColumnProps {
  status: TaskData['status']
  taskIds: string[]
  children: ReactNode
}

/** A status column: a droppable area holding a vertical sortable list of cards. */
export function BoardColumn({ status, taskIds, children }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId(status),
    data: { type: 'column', status },
  })
  const heading = `${status.toLowerCase()}-heading`
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={heading}
      className={`flex w-72 shrink-0 snap-start flex-col gap-3 rounded-xl border bg-muted/30 p-3 motion-safe:transition-colors ${
        isOver ? 'border-primary ring-2 ring-primary/30' : ''
      }`}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 id={heading} className="text-sm font-semibold">
          {label(status)}
        </h3>
        <Badge variant="secondary" aria-label={`${taskIds.length} tasks`}>
          {taskIds.length}
        </Badge>
      </header>
      <SortableContext id={columnId(status)} items={taskIds} strategy={verticalListSortingStrategy}>
        <ol
          className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto"
          aria-label={`${label(status)} tasks`}
        >
          {children}
        </ol>
      </SortableContext>
    </section>
  )
}
