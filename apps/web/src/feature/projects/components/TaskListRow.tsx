import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { TableCell, TableRow } from '@/components/ui/table'
import { SortableHandle } from '../dnd/SortableHandle'
import { label, TASK_PRIORITIES, TASK_STATUSES, type Person, type TaskData } from '../lib'
import { PersonSelect } from './PersonSelect'
import { OverdueBadge } from './StatusBadge'

export type InlineTaskPatch = Partial<
  Pick<TaskData, 'status' | 'priority' | 'dueDate'> & { ownerId: string | null }
>

export interface TaskListRowProps {
  task: TaskData
  members: ReadonlyArray<Person>
  otherPhases: ReadonlyArray<{ id: string; name: string }>
  canEdit: boolean
  /** Drag reordering is only offered in manual order. */
  sortable: boolean
  isFirst: boolean
  isLast: boolean
  onOpen: (taskId: string) => void
  onInlineChange: (taskId: string, patch: InlineTaskPatch) => void
  onMoveToPhase: (task: TaskData, phaseId: string) => void
  onMoveStep: (task: TaskData, direction: -1 | 1) => void
}

/** One task in the List: inline editors for status, owner, priority and due date (US2 scenario 4). */
export function TaskListRow({
  task,
  members,
  otherPhases,
  canEdit,
  sortable,
  isFirst,
  isLast,
  onOpen,
  onInlineChange,
  onMoveToPhase,
  onMoveStep,
}: TaskListRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', phaseId: task.phaseId },
    disabled: !sortable,
  })
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : undefined}
      data-task-id={task.id}
    >
      <TableCell className="w-10 pr-0">
        {sortable ? (
          <SortableHandle
            label={task.title}
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
            className="size-7"
          />
        ) : null}
      </TableCell>
      <TableCell className="min-w-56">
        <button
          type="button"
          className="text-left font-medium hover:underline"
          onClick={() => onOpen(task.id)}
        >
          {task.title}
        </button>
        <span className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
          {task.predecessor ? <span>after {task.predecessor.title}</span> : null}
          {task.overdue ? <OverdueBadge /> : null}
          {task.predecessorConflict ? (
            <span className="text-destructive">starts before its predecessor is due</span>
          ) : null}
        </span>
      </TableCell>
      <TableCell>
        <NativeSelect
          aria-label={`Status for ${task.title}`}
          value={task.status}
          disabled={!canEdit}
          onChange={(e) =>
            onInlineChange(task.id, { status: e.target.value as TaskData['status'] })
          }
          className="h-8 min-w-32"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </NativeSelect>
      </TableCell>
      <TableCell>
        <PersonSelect
          aria-label={`Owner for ${task.title}`}
          people={members}
          value={task.owner?.id ?? ''}
          disabled={!canEdit}
          onChange={(id) => onInlineChange(task.id, { ownerId: id || null })}
          className="h-8 min-w-32"
        />
      </TableCell>
      <TableCell>
        <NativeSelect
          aria-label={`Priority for ${task.title}`}
          value={task.priority}
          disabled={!canEdit}
          onChange={(e) =>
            onInlineChange(task.id, { priority: e.target.value as TaskData['priority'] })
          }
          className="h-8 min-w-24"
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {label(p)}
            </option>
          ))}
        </NativeSelect>
      </TableCell>
      <TableCell>
        <Input
          type="date"
          aria-label={`Due date for ${task.title}`}
          value={task.dueDate ?? ''}
          disabled={!canEdit}
          onChange={(e) => onInlineChange(task.id, { dueDate: e.target.value || null })}
          className={`h-8 min-w-36 ${task.overdue ? 'text-destructive' : ''}`}
        />
      </TableCell>
      <TableCell className="w-12">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Actions for ${task.title}`}
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpen(task.id)}>Open</DropdownMenuItem>
            {canEdit ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Move to phase</DropdownMenuLabel>
                {otherPhases.map((p) => (
                  <DropdownMenuItem key={p.id} onSelect={() => onMoveToPhase(task, p.id)}>
                    {p.name}
                  </DropdownMenuItem>
                ))}
                {sortable ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled={isFirst} onSelect={() => onMoveStep(task, -1)}>
                      Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={isLast} onSelect={() => onMoveStep(task, 1)}>
                      Move down
                    </DropdownMenuItem>
                  </>
                ) : null}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
