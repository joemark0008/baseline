import { BadRequestException } from '@nestjs/common'
import { effectivePermissions, normalizeGrants } from './access-policy.js'
import { defineArea } from './define-area.js'

const areas = [
  defineArea({ key: 'orders', name: 'Orders', actions: { view: 'v', add: 'a', delete: 'd' } }),
  defineArea({ key: 'reports', name: 'Reports', actions: { view: 'v' } }),
]

describe('effectivePermissions', () => {
  it('gives Admin every offered permission, including areas added later', () => {
    expect([...effectivePermissions('ADMIN', [], areas)]).toEqual([
      'orders:view',
      'orders:add',
      'orders:delete',
      'reports:view',
    ])
  })

  it('gives other roles only their grants that still exist in the catalogue', () => {
    const grants = [
      { area: 'orders', action: 'view' },
      { area: 'orders', action: 'edit' }, // not offered by orders
      { area: 'gone', action: 'view' }, // area removed from the product
    ]
    expect([...effectivePermissions('CUSTOM', grants, areas)]).toEqual(['orders:view'])
  })

  it('gives Member nothing by default', () => {
    expect(effectivePermissions('MEMBER', [], areas).size).toBe(0)
  })
})

describe('normalizeGrants', () => {
  it('adds View when Add, Edit or Delete is granted', () => {
    expect(normalizeGrants([{ area: 'orders', action: 'delete' }], areas)).toEqual([
      { area: 'orders', action: 'view' },
      { area: 'orders', action: 'delete' },
    ])
  })

  it('removes duplicates and sorts in catalogue order', () => {
    const out = normalizeGrants(
      [
        { area: 'reports', action: 'view' },
        { area: 'orders', action: 'view' },
        { area: 'orders', action: 'view' },
      ],
      areas,
    )
    expect(out).toEqual([
      { area: 'orders', action: 'view' },
      { area: 'reports', action: 'view' },
    ])
  })

  it('rejects an unknown area or an action the area does not offer', () => {
    expect(() => normalizeGrants([{ area: 'gone', action: 'view' }], areas)).toThrow(
      BadRequestException,
    )
    expect(() => normalizeGrants([{ area: 'reports', action: 'add' }], areas)).toThrow(
      /Unknown permission reports:add/,
    )
  })
})
