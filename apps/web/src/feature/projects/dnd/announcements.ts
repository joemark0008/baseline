import type { Announcements, ScreenReaderInstructions, UniqueIdentifier } from '@dnd-kit/core'

/** Where an item sits: its container's name and 1-based index among `count`. */
export interface Place {
  title: string
  container: string
  index: number
  count: number
}

/** What an `over` target means: a container (possibly empty) or the place of the item under it. */
export interface Target {
  container: string
  index: number
  count: number
}

export const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'To pick up an item, press Space or Enter. Use the arrow keys to move it to another position or column, press Space or Enter again to drop it, or press Escape to cancel.',
}

/** The live-region text from contracts/ui-interaction.md › Announcements. */
export function makeAnnouncements(
  item: (id: UniqueIdentifier) => Place | null,
  target: (id: UniqueIdentifier, activeId: UniqueIdentifier) => Target | null,
  noun = 'task',
): Announcements {
  const where = (p: { container: string; index: number; count: number }) =>
    `${p.container}, position ${p.index} of ${p.count}`
  return {
    onDragStart({ active }) {
      const p = item(active.id)
      return p ? `Picked up ${noun} "${p.title}" in ${where(p)}.` : undefined
    },
    onDragOver({ active, over }) {
      const p = item(active.id)
      if (!p) return undefined
      const t = over ? target(over.id, active.id) : null
      return t
        ? `${cap(noun)} "${p.title}" is over ${where(t)}.`
        : `${cap(noun)} "${p.title}" is no longer over a drop area.`
    },
    onDragEnd({ active, over }) {
      const p = item(active.id)
      if (!p) return undefined
      const t = over ? target(over.id, active.id) : null
      return t
        ? `${cap(noun)} "${p.title}" moved to ${where(t)}.`
        : `${cap(noun)} "${p.title}" was dropped outside a drop area and returned to ${where(p)}.`
    },
    onDragCancel({ active }) {
      const p = item(active.id)
      return p ? `Move cancelled. ${cap(noun)} "${p.title}" returned to ${where(p)}.` : undefined
    },
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
