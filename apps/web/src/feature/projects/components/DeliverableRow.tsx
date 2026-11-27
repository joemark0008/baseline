import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TableCell, TableRow } from '@/components/ui/table'
import { SortableHandle } from '../dnd/SortableHandle'
import { formatDate, type DeliverableData } from '../lib'
import { StatusBadge } from './StatusBadge'

export interface DeliverableRowProps {
  deliverable: DeliverableData
  otherPhases: ReadonlyArray<{ id: string; name: string }>
  canEdit: boolean
  isFirst: boolean
  isLast: boolean
  onEdit: (d: DeliverableData) => void
  onReview: (d: DeliverableData) => void
  onRemove: (d: DeliverableData) => void
  onMoveToPhase: (d: DeliverableData, phaseId: string) => void
  onMoveStep: (d: DeliverableData, direction: -1 | 1) => void
}

/** One deliverable on Readiness: sortable by handle, movable across phases from its menu (US4). */
export function DeliverableRow({
  deliverable: d,
  otherPhases,
  canEdit,
  isFirst,
  isLast,
  onEdit,
  onReview,
  onRemove,
  onMoveToPhase,
  onMoveStep,
}: DeliverableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: d.id,
    data: { type: 'deliverable', phaseId: d.phaseId },
    disabled: !canEdit,
  })
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : undefined}
    >
      <TableCell className="w-10 pr-0">
        {canEdit ? (
          <SortableHandle
            label={d.title}
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
            className="size-7"
          />
        ) : null}
      </TableCell>
      <TableCell className="min-w-56">
        <p className="font-medium">{d.title}</p>
        {d.links.length ? (
          <p className="mt-1 flex flex-wrap gap-2 text-xs">
            {d.links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
              >
                <ExternalLink aria-hidden="true" className="size-3" />
                {l.label}
              </a>
            ))}
          </p>
        ) : null}
      </TableCell>
      <TableCell>
        <StatusBadge value={d.kind} />
      </TableCell>
      <TableCell>{d.owner?.name ?? 'Unassigned'}</TableCell>
      <TableCell>{d.reviewer?.name ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(d.dueDate)}</TableCell>
      <TableCell>
        <StatusBadge value={d.status} />
      </TableCell>
      <TableCell>
        {d.reviewOutcome ? (
          <span className="flex flex-col gap-1">
            <StatusBadge value={d.reviewOutcome} />
            {d.reviewNote ? (
              <span className="text-xs text-muted-foreground">{d.reviewNote}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not reviewed</span>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${d.title}`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(d)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onReview(d)}>Record review</DropdownMenuItem>
            {canEdit ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Move to phase</DropdownMenuLabel>
                {otherPhases.map((p) => (
                  <DropdownMenuItem key={p.id} onSelect={() => onMoveToPhase(d, p.id)}>
                    {p.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isFirst} onSelect={() => onMoveStep(d, -1)}>
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isLast} onSelect={() => onMoveStep(d, 1)}>
                  Move down
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onRemove(d)}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
