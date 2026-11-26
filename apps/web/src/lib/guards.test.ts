import type { Access } from './access'
import { guardProtected } from './guards'

const session = { user: { id: 'u1' } }
const withPermissions = (...permissions: string[]): Access => ({
  role: { id: 'r', name: 'R', kind: 'CUSTOM' },
  permissions,
})

describe('guardProtected', () => {
  it('sends anonymous visitors to /login', () => {
    expect(guardProtected(null, null, '/dashboard')).toEqual({ allow: false, redirectTo: '/login' })
  })

  it('keeps people without users:view out of the users page', () => {
    expect(guardProtected(session, withPermissions(), '/admin/users')).toEqual({
      allow: false,
      redirectTo: '/dashboard',
    })
    expect(guardProtected(session, withPermissions('users:view'), '/admin/users')).toEqual({
      allow: true,
    })
  })

  it('allows signed-in people on pages that need no permission', () => {
    expect(guardProtected(session, withPermissions(), '/settings')).toEqual({ allow: true })
  })
})
