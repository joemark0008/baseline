import { defineArea } from './define-area.js'

describe('defineArea', () => {
  it('returns the area with its action descriptions', () => {
    const area = defineArea({ key: 'orders', name: 'Orders', actions: { view: 'See orders' } })
    expect(area.actions.view).toBe('See orders')
    expect(Object.isFrozen(area)).toBe(true)
  })

  it('rejects an area without actions', () => {
    expect(() => defineArea({ key: 'orders', name: 'Orders', actions: {} })).toThrow(/at least one/)
  })

  it('rejects a key that is not kebab-case', () => {
    expect(() => defineArea({ key: 'Orders', name: 'Orders', actions: { view: 'x' } })).toThrow(
      /kebab-case/,
    )
  })

  it('rejects an empty action description', () => {
    expect(() => defineArea({ key: 'orders', name: 'Orders', actions: { view: ' ' } })).toThrow(
      /description/,
    )
  })
})
