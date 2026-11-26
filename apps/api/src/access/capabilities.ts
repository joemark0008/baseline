import type { PersonAccess } from './access.service.js'
import type { Action } from './actions.js'
import type { AreaDef } from './define-area.js'
import type { RoleKind } from './role-kind.js'

/**
 * What the caller may do to one person or role. The web shows controls from these flags and
 * never re-derives the rules; the services still enforce every rule on each change.
 */
export interface UserCaps {
  edit: boolean
  changeRole: boolean
  deactivate: boolean
  reactivate: boolean
  /** Create a password reset link (feature 002): Admin role only, not yourself, not deactivated. */
  resetPassword: boolean
  /** Change the password from Settings → Account: your own record, and you have a password. */
  changePassword: boolean
}

export interface RoleCaps {
  /** Can people be put in this role by the caller (Admin only for Admins). */
  assign: boolean
  edit: boolean
  rename: boolean
  editGrants: boolean
  delete: boolean
}

const isAdmin = (a: PersonAccess) => a.role.kind === 'ADMIN'

export function userCapabilities(
  callerId: string,
  caller: PersonAccess,
  target: { id: string; kind: RoleKind; deactivated: boolean; hasPassword?: boolean },
): UserCaps {
  const self = callerId === target.id
  // Only Admins act on people in Admin (FR-012).
  const reachable = target.kind !== 'ADMIN' || isAdmin(caller)
  return {
    edit: caller.permissions.has('users:edit'),
    changeRole: caller.permissions.has('roles:edit') && !self && reachable,
    deactivate: caller.permissions.has('users:delete') && !self && !target.deactivated && reachable,
    reactivate: isAdmin(caller) && target.deactivated,
    resetPassword: isAdmin(caller) && !self && !target.deactivated,
    changePassword: self && target.hasPassword === true,
  }
}

export function roleCapabilities(
  caller: PersonAccess,
  role: { kind: RoleKind; memberCount: number; pendingInviteCount: number },
): RoleCaps {
  const mayEdit = caller.permissions.has('roles:edit')
  const unused = role.memberCount === 0 && role.pendingInviteCount === 0
  return {
    assign: role.kind !== 'ADMIN' || isAdmin(caller),
    edit: mayEdit,
    rename: mayEdit && role.kind === 'CUSTOM',
    editGrants: mayEdit && role.kind !== 'ADMIN',
    delete: caller.permissions.has('roles:delete') && role.kind === 'CUSTOM' && unused,
  }
}

/** Actions that must be granted along with `action` on `area`: Add/Edit/Delete need View. */
export function requiredActions(area: AreaDef, action: Action): Action[] {
  return action !== 'view' && area.actions.view !== undefined ? ['view'] : []
}
