import type { PersonAccess } from './access.service.js'
import { requiredActions, roleCapabilities, userCapabilities } from './capabilities.js'
import { defineArea } from './define-area.js'

const person = (kind: 'ADMIN' | 'MEMBER' | 'CUSTOM', ...perms: string[]): PersonAccess => ({
  role: { id: 'r', name: 'R', kind },
  permissions: new Set(perms) as PersonAccess['permissions'],
})
const ALL = ['users:edit', 'users:delete', 'roles:edit', 'roles:delete'] as const

describe('userCapabilities', () => {
  const member = { id: 'u2', kind: 'MEMBER' as const, deactivated: false }
  const admin = { id: 'u3', kind: 'ADMIN' as const, deactivated: false }

  it('follows the caller permissions', () => {
    expect(userCapabilities('u1', person('CUSTOM', ...ALL), member)).toEqual({
      edit: true,
      changeRole: true,
      deactivate: true,
      reactivate: false,
      resetPassword: false,
      changePassword: false,
    })
    expect(userCapabilities('u1', person('MEMBER'), member)).toEqual({
      edit: false,
      changeRole: false,
      deactivate: false,
      reactivate: false,
      resetPassword: false,
      changePassword: false,
    })
  })

  it('never lets you change your own role or deactivate yourself', () => {
    const caps = userCapabilities('u2', person('ADMIN', ...ALL), member)
    expect(caps.changeRole).toBe(false)
    expect(caps.deactivate).toBe(false)
  })

  it('leaves Admins to Admins, and reactivation to Admins', () => {
    expect(userCapabilities('u1', person('CUSTOM', ...ALL), admin)).toMatchObject({
      changeRole: false,
      deactivate: false,
    })
    expect(userCapabilities('u1', person('ADMIN', ...ALL), admin)).toMatchObject({
      changeRole: true,
      deactivate: true,
    })
    const gone = { ...member, deactivated: true }
    expect(userCapabilities('u1', person('CUSTOM', ...ALL), gone).reactivate).toBe(false)
    expect(userCapabilities('u1', person('ADMIN'), gone)).toMatchObject({
      reactivate: true,
      deactivate: false,
    })
  })
})

describe('userCapabilities: passwords', () => {
  const member = { id: 'u2', kind: 'MEMBER' as const, deactivated: false }

  it('lets only Admins create reset links, never for themselves or a deactivated person', () => {
    expect(userCapabilities('u1', person('ADMIN'), member).resetPassword).toBe(true)
    expect(userCapabilities('u1', person('CUSTOM', ...ALL), member).resetPassword).toBe(false)
    expect(userCapabilities('u2', person('ADMIN'), member).resetPassword).toBe(false)
    expect(
      userCapabilities('u1', person('ADMIN'), { ...member, deactivated: true }).resetPassword,
    ).toBe(false)
  })

  it('offers a password change on your own record when you have a password', () => {
    expect(
      userCapabilities('u2', person('MEMBER'), { ...member, hasPassword: true }).changePassword,
    ).toBe(true)
    expect(
      userCapabilities('u2', person('MEMBER'), { ...member, hasPassword: false }).changePassword,
    ).toBe(false)
    expect(
      userCapabilities('u1', person('ADMIN'), { ...member, hasPassword: true }).changePassword,
    ).toBe(false)
  })
})

describe('roleCapabilities', () => {
  const custom = { kind: 'CUSTOM' as const, memberCount: 0, pendingInviteCount: 0 }

  it('allows everything on an unused custom role with the permissions', () => {
    expect(roleCapabilities(person('CUSTOM', ...ALL), custom)).toEqual({
      assign: true,
      edit: true,
      rename: true,
      editGrants: true,
      delete: true,
    })
  })

  it('protects built-ins and roles in use', () => {
    const caller = person('CUSTOM', ...ALL)
    expect(roleCapabilities(caller, { ...custom, kind: 'MEMBER' })).toMatchObject({
      rename: false,
      editGrants: true,
      delete: false,
    })
    expect(roleCapabilities(caller, { ...custom, kind: 'ADMIN' })).toMatchObject({
      assign: false,
      editGrants: false,
    })
    expect(roleCapabilities(person('ADMIN'), { ...custom, kind: 'ADMIN' }).assign).toBe(true)
    expect(roleCapabilities(caller, { ...custom, memberCount: 1 }).delete).toBe(false)
  })
})

describe('requiredActions', () => {
  const area = defineArea({ key: 'x', name: 'X', actions: { view: 'v', add: 'a' } })
  const noView = defineArea({ key: 'y', name: 'Y', actions: { add: 'a' } })

  it('makes Add, Edit and Delete require View when the area offers it', () => {
    expect(requiredActions(area, 'add')).toEqual(['view'])
    expect(requiredActions(area, 'view')).toEqual([])
    expect(requiredActions(noView, 'add')).toEqual([])
  })
})
