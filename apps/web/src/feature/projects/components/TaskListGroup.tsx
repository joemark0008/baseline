import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PhaseData } from '../lib'

export const groupId = (phaseId: string) => `phase:${phaseId}`
export const phaseOfGroup = (id: string | number): string | null =>
  typeof id === 'string' && id.startsWith('phase:') ? id.slice(6) : null

export interface TaskListGroupProps {
  phase: PhaseData
  taskIds: string[]
  /** Rendered under the rows; the quick-add form. */
  footer?: ReactNode
  children: ReactNode
}

/** One collapsible phase group of the List: droppable, sortable, with its count and quick-add. */
export function TaskListGroup({ phase, taskIds, footer, children }: TaskListGroupProps) {
  const [open, setOpen] = useState(true)
  const { setNodeRef, isOver } = useDroppable({
    id: groupId(phase.id),
    data: { type: 'phase', phaseId: phase.id },
  })
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section
        ref={setNodeRef}
        aria-label={phase.name}
        className={`rounded-xl border motion-safe:transition-colors ${isOver ? 'border-primary ring-2 ring-primary/30' : ''}`}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 px-2" aria-expanded={open}>
              <ChevronRight
                aria-hidden="true"
                className={`size-4 motion-safe:transition-transform ${open ? 'rotate-90' : ''}`}
              />
              <span className="font-semibold">{phase.name}</span>
            </Button>
          </CollapsibleTrigger>
          <Badge variant="secondary" aria-label={`${taskIds.length} tasks in ${phase.name}`}>
            {taskIds.length}
          </Badge>
        </div>
        <CollapsibleContent className="flex flex-col gap-2 border-t px-3 pt-1 pb-3">
          <SortableContext
            id={groupId(phase.id)}
            items={taskIds}
            strategy={verticalListSortingStrategy}
          >
            <Table aria-label={`${phase.name} tasks`}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Reorder</span>
                  </TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{children}</TableBody>
            </Table>
          </SortableContext>
          {footer}
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
