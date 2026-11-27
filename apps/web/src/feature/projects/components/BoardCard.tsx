import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SortableHandle } from '../dnd/SortableHandle'
import { formatDate, initials, label, TASK_STATUSES, type TaskData } from '../lib'
import { StatusBadge } from './StatusBadge'

export interface BoardCardProps {
  task: TaskData
  phaseName: string
  /** Shows the handle and the move menu; false renders a read-only card. */
  canEdit: boolean
  onOpen: (taskId: string) => void
  onMoveTo: (task: TaskData, status: TaskData['status']) => void
  onMoveStep: (task: TaskData, direction: -1 | 1) => void
  isFirst?: boolean
  isLast?: boolean
}

/** What a card shows: title, owner, due date (overdue in red), priority and phase (FR-002). */
export function BoardCardBody({ task, phaseName }: { task: TaskData; phaseName: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="text-sm leading-snug font-medium">{task.title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge value={task.priority} />
        <Badge variant="outline" className="max-w-32 truncate">
          {phaseName}
        </Badge>
        {task.predecessorConflict ? (
          <Badge className="border-destructive/20 bg-destructive/10 text-destructive">
            Starts before predecessor
          </Badge>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={task.overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}>
          {task.dueDate ? `Due ${formatDate(task.dueDate, false)}` : 'No due date'}
          {task.overdue ? ' · Overdue' : ''}
        </span>
        {task.owner ? (
          <Avatar size="sm" aria-label={task.owner.name} title={task.owner.name}>
            <AvatarFallback>{initials(task.owner.name)}</AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
      </div>
    </div>
  )
}

/** One sortable card: the handle drags by keyboard or pointer, the body drags by pointer. */
export function BoardCard({
  task,
  phaseName,
  canEdit,
  onOpen,
  onMoveTo,
  onMoveStep,
  isFirst = false,
  isLast = false,
}: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', status: task.status }, disabled: !canEdit })
  // The body takes pointer and touch starts only; keyboard pick-up stays on the handle.
  const { onKeyDown: _keyboard, ...pointerListeners } = listeners ?? {}
  void _keyboard
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex gap-1 rounded-lg border bg-card p-3 shadow-xs motion-safe:transition-shadow ${
        isDragging ? 'opacity-40' : ''
      } ${canEdit ? 'touch-manipulation' : ''}`}
      data-task-id={task.id}
      {...(canEdit ? pointerListeners : {})}
    >
      <BoardCardBody task={task} phaseName={phaseName} />
      <div className="flex shrink-0 flex-col items-center gap-1">
        {canEdit ? (
          <SortableHandle
            label={task.title}
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
            className="size-7"
          />
        ) : null}
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
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => onMoveTo(task, s)}>
                    {label(s)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isFirst} onSelect={() => onMoveStep(task, -1)}>
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isLast} onSelect={() => onMoveStep(task, 1)}>
                  Move down
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}
