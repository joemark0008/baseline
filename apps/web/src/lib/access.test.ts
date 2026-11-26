import { can, type Access } from './access'

const cashier: Access = {
  role: { id: 'r1', name: 'Cashier', kind: 'CUSTOM' },
  permissions: ['users:view', 'invites:add'],
}

describe('can', () => {
  it('is true only for permissions the role has', () => {
    expect(can(cashier, 'users', 'view')).toBe(true)
    expect(can(cashier, 'invites', 'add')).toBe(true)
    expect(can(cashier, 'users', 'delete')).toBe(false)
  })

  it('is false without access', () => {
    expect(can(null, 'users', 'view')).toBe(false)
  })
})
