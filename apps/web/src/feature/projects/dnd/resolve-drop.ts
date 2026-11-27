import type { UniqueIdentifier } from '@dnd-kit/core'
import { neighboursFor, type Neighbours } from '../lib'

/** Item ids per container (a Board column or a List phase group), in display order. */
export type Containers = Record<string, string[]>

/** Which container an id belongs to: the container itself, or the one holding the item. */
export function containerOf(
  containers: Containers,
  id: UniqueIdentifier,
  isContainer: (id: UniqueIdentifier) => string | null,
): string | null {
  const direct = isContainer(id)
  if (direct !== null) return direct
  return Object.keys(containers).find((key) => containers[key].includes(String(id))) ?? null
}

/** The neighbours of `id` where it currently sits in `ids` (or at the end if absent). */
export function neighboursAt(ids: string[], id: string): Neighbours {
  const idx = ids.indexOf(id)
  if (idx === -1) return neighboursFor(ids, id, null)
  const out: Neighbours = {}
  if (idx > 0) out.afterTaskId = ids[idx - 1]
  if (idx < ids.length - 1) out.beforeTaskId = ids[idx + 1]
  return out
}

const sameNeighbours = (a: Neighbours, b: Neighbours) =>
  a.afterTaskId === b.afterTaskId && a.beforeTaskId === b.beforeTaskId

/**
 * Pure: what a drop means. `live` is the order shown during the drag (a cross-container preview
 * already holds the item where it will land), `origin` the order before the drag. Returns null
 * when nothing would change (FR-013).
 */
export function resolveDrop(
  live: Containers,
  origin: Containers,
  activeId: string,
  overId: UniqueIdentifier | null,
  isContainer: (id: UniqueIdentifier) => string | null,
): { container: string; neighbours: Neighbours } | null {
  const from = containerOf(origin, activeId, isContainer)
  const current = containerOf(live, activeId, isContainer)
  const to = (overId === null ? current : containerOf(live, overId, isContainer)) ?? current
  if (!from || !to) return null
  const overItem = overId !== null && isContainer(overId) === null ? String(overId) : null
  if (to !== from) {
    const ids = live[to] ?? []
    const neighbours = ids.includes(activeId)
      ? neighboursAt(ids, activeId)
      : neighboursFor(ids, activeId, overItem)
    return { container: to, neighbours }
  }
  // Same container: the sortable preview is visual only, so resolve against the original order.
  const ids = origin[from]
  const neighbours =
    overItem === null || overItem === activeId
      ? neighboursAt(ids, activeId)
      : neighboursFor(ids, activeId, overItem)
  if (sameNeighbours(neighbours, neighboursAt(ids, activeId))) return null
  return { container: to, neighbours }
}

/** Live preview while dragging across containers: the item follows the pointer into `to`. */
export function previewMove(
  containers: Containers,
  activeId: string,
  from: string,
  to: string,
  overId: UniqueIdentifier,
  isContainer: (id: UniqueIdentifier) => string | null,
): Containers {
  const next: Containers = {
    ...containers,
    [from]: containers[from].filter((id) => id !== activeId),
  }
  const target = [...(containers[to] ?? [])].filter((id) => id !== activeId)
  const overIndex = isContainer(overId) !== null ? target.length : target.indexOf(String(overId))
  target.splice(overIndex === -1 ? target.length : overIndex, 0, activeId)
  next[to] = target
  return next
}
