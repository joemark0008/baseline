import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SortableHandle } from '../dnd/SortableHandle'
import { formatDate, type PhaseData } from '../lib'
import { OverdueBadge, StatusBadge } from './StatusBadge'

export interface PhaseRowProps {
  phase: PhaseData
  index: number
  count: number
  /** Managers: handle plus edit, move and remove actions. */
  canManage: boolean
  onEdit: (phase: PhaseData) => void
  onRemove: (phase: PhaseData) => void
  onMoveStep: (phase: PhaseData, direction: -1 | 1) => void
}

/** One phase of the plan on Overview: sortable by handle, with the arrow moves kept in its menu (US4). */
export function PhaseRow({
  phase,
  index,
  count,
  canManage,
  onEdit,
  onRemove,
  onMoveStep,
}: PhaseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id, disabled: !canManage })
  const open = phase.tasks.filter((t) => t.status !== 'COMPLETE').length
  const overdue = phase.tasks.filter((t) => t.overdue).length
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap ${isDragging ? 'opacity-40' : ''}`}
    >
      {canManage ? (
        <SortableHandle
          label={phase.name}
          attributes={attributes}
          listeners={listeners}
          setActivatorNodeRef={setActivatorNodeRef}
        />
      ) : null}
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{phase.name}</p>
          <StatusBadge value={phase.status} />
          {overdue ? <OverdueBadge /> : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDate(phase.startDate, false)} – {formatDate(phase.endDate, false)} ·{' '}
          {phase.owner ? phase.owner.name : 'No owner'} · {open} open task
          {open === 1 ? '' : 's'} · {phase.deliverables.length} deliverable
          {phase.deliverables.length === 1 ? '' : 's'}
        </p>
      </div>
      {canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${phase.name}`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(phase)}>Edit phase</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={index === 0} onSelect={() => onMoveStep(phase, -1)}>
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === count - 1} onSelect={() => onMoveStep(phase, 1)}>
              Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onRemove(phase)}>
              Remove phase
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  )
}
