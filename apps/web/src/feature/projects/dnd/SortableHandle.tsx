import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface SortableHandleProps {
  /** Names the item for assistive technology: "Drag to reorder Pharmacy". */
  label: string
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  setActivatorNodeRef?: (el: HTMLElement | null) => void
  className?: string
}

/** The grip that starts a drag by pointer, touch or keyboard; hidden entirely when not allowed. */
export function SortableHandle({
  label,
  attributes,
  listeners,
  setActivatorNodeRef,
  className,
}: SortableHandleProps) {
  return (
    <Button
      ref={setActivatorNodeRef}
      type="button"
      variant="ghost"
      size="icon"
      className={`cursor-grab touch-none active:cursor-grabbing ${className ?? ''}`}
      aria-label={`Drag to reorder ${label}`}
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden="true" />
    </Button>
  )
}
