import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/**
 * One sensor set for every drag surface (contracts/ui-interaction.md › Sensors): a small pointer
 * distance so clicks still click, press-and-hold on touch so scrolling never drags, and the
 * keyboard for sorting.
 */
export function useWorkSensors(
  coordinateGetter: KeyboardCoordinateGetter = sortableKeyboardCoordinates,
) {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  )
}

/** Pointer and touch only: surfaces with their own keyboard model (the timeline bars). */
export function usePointerSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )
}

/** Respects the viewer's reduced-motion preference for drop animations and transitions. */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
