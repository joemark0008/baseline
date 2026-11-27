import { previewMove, resolveDrop } from './resolve-drop'

const isColumn = (id: string | number) =>
  typeof id === 'string' && id.startsWith('column:') ? id.slice(7) : null
const origin = { UPCOMING: ['a', 'b'], IN_PROGRESS: ['c'], BLOCKED: [], COMPLETE: [] }

describe('resolveDrop', () => {
  it('reorders inside a container against the original order', () => {
    expect(resolveDrop(origin, origin, 'a', 'b', isColumn)).toEqual({
      container: 'UPCOMING',
      neighbours: { afterTaskId: 'b' },
    })
    expect(resolveDrop(origin, origin, 'b', 'a', isColumn)).toEqual({
      container: 'UPCOMING',
      neighbours: { beforeTaskId: 'a' },
    })
  })

  it('returns null when the drop changes nothing', () => {
    expect(resolveDrop(origin, origin, 'a', 'a', isColumn)).toBeNull()
    expect(resolveDrop(origin, origin, 'a', null, isColumn)).toBeNull()
    expect(resolveDrop(origin, origin, 'a', 'column:UPCOMING', isColumn)).toBeNull()
  })

  it('uses the preview position for a cross-container drop', () => {
    const live = { ...origin, UPCOMING: ['b'], IN_PROGRESS: ['a', 'c'] }
    expect(resolveDrop(live, origin, 'a', 'c', isColumn)).toEqual({
      container: 'IN_PROGRESS',
      neighbours: { beforeTaskId: 'c' },
    })
    const empty = { ...origin, UPCOMING: ['b'], BLOCKED: ['a'] }
    expect(resolveDrop(empty, origin, 'a', 'column:BLOCKED', isColumn)).toEqual({
      container: 'BLOCKED',
      neighbours: {},
    })
    // No preview happened (dropped straight onto a card): insert before it.
    expect(resolveDrop(origin, origin, 'a', 'c', isColumn)).toEqual({
      container: 'IN_PROGRESS',
      neighbours: { beforeTaskId: 'c' },
    })
  })
})

describe('previewMove', () => {
  it('moves the item into the hovered container at the hovered index', () => {
    expect(previewMove(origin, 'a', 'UPCOMING', 'IN_PROGRESS', 'c', isColumn)).toMatchObject({
      UPCOMING: ['b'],
      IN_PROGRESS: ['a', 'c'],
    })
    expect(
      previewMove(origin, 'a', 'UPCOMING', 'BLOCKED', 'column:BLOCKED', isColumn),
    ).toMatchObject({
      UPCOMING: ['b'],
      BLOCKED: ['a'],
    })
  })
})
