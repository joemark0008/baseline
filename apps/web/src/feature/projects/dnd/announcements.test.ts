import type { Active, Over } from '@dnd-kit/core'
import { makeAnnouncements } from './announcements'

const active = { id: 't1' } as Active
const over = { id: 'col-in-progress' } as Over
const item = (id: string | number) =>
  id === 't1' ? { title: 'Validate', container: 'Upcoming', index: 2, count: 3 } : null
const target = (id: string | number) =>
  id === 'col-in-progress' ? { container: 'In progress', index: 1, count: 1 } : null

describe('drag announcements', () => {
  const a = makeAnnouncements(item, target)

  it('describes pick-up, movement, drop and cancel', () => {
    expect(a.onDragStart({ active })).toBe(
      'Picked up task "Validate" in Upcoming, position 2 of 3.',
    )
    expect(a.onDragOver({ active, over })).toBe(
      'Task "Validate" is over In progress, position 1 of 1.',
    )
    expect(a.onDragEnd({ active, over })).toBe(
      'Task "Validate" moved to In progress, position 1 of 1.',
    )
    expect(a.onDragCancel({ active, over: null })).toBe(
      'Move cancelled. Task "Validate" returned to Upcoming, position 2 of 3.',
    )
  })

  it('says when the drop landed nowhere', () => {
    expect(a.onDragEnd({ active, over: null })).toBe(
      'Task "Validate" was dropped outside a drop area and returned to Upcoming, position 2 of 3.',
    )
    expect(a.onDragStart({ active: { id: 'unknown' } as Active })).toBeUndefined()
  })
})
