import { summarizeChange } from './access-change.js'

describe('summarizeChange', () => {
  it('describes a new role with its permissions', () => {
    expect(summarizeChange('ROLE_CREATED', null, { name: 'Cashier', grants: ['users:view'] })).toBe(
      'Created role "Cashier" with users:view',
    )
    expect(summarizeChange('ROLE_CREATED', null, { name: 'Empty', grants: [] })).toBe(
      'Created role "Empty" with no permissions',
    )
  })

  it('lists what changed on a role', () => {
    expect(
      summarizeChange(
        'ROLE_UPDATED',
        { name: 'Cashier', description: null, grants: ['users:view', 'invites:add'] },
        { name: 'Till', description: 'Front desk', grants: ['users:view', 'users:edit'] },
      ),
    ).toBe('Role "Till": renamed from "Cashier"; description changed; +users:edit, -invites:add')
  })

  it('describes deletions, role moves and deactivation', () => {
    expect(summarizeChange('ROLE_DELETED', { name: 'Old', grants: [] }, null)).toBe(
      'Deleted role "Old"',
    )
    expect(
      summarizeChange(
        'USER_ROLE_CHANGED',
        { user: 'Ada', role: 'Member' },
        { user: 'Ada', role: 'Cashier' },
      ),
    ).toBe('Ada: Member → Cashier')
    expect(summarizeChange('USER_DEACTIVATED', null, { user: 'Ada' })).toBe('Deactivated Ada')
    expect(summarizeChange('USER_REACTIVATED', null, { user: 'Ada' })).toBe('Reactivated Ada')
  })

  it('summarizes password events with names only', () => {
    const who = { user: 'Ada' }
    expect(summarizeChange('PASSWORD_RESET_LINK_CREATED', null, who)).toBe(
      'Created a password reset link for Ada',
    )
    expect(summarizeChange('PASSWORD_RESET_LINK_CANCELLED', null, who)).toBe(
      'Cancelled the password reset link for Ada',
    )
    expect(summarizeChange('PASSWORD_RESET_COMPLETED', null, who)).toBe(
      'Ada set a new password with a reset link',
    )
    expect(summarizeChange('PASSWORD_CHANGED', null, who)).toBe('Ada changed their password')
  })
})
