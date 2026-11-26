/**
 * What the signed-in person may do, from the `myAccess` query. UX only: the API enforces every
 * permission, so hiding a control here is a convenience, never the protection.
 */
export type PermissionActionName = 'view' | 'add' | 'edit' | 'delete'

export interface Access {
  role: { id: string; name: string; kind: string }
  /** `"area:action"`, e.g. `"users:view"`. */
  permissions: readonly string[]
}

export interface Requirement {
  area: string
  action: PermissionActionName
}

export function can(access: Access | null | undefined, area: string, action: PermissionActionName) {
  return access?.permissions.includes(`${area}:${action}`) ?? false
}

export function meets(access: Access | null | undefined, req: Requirement | undefined): boolean {
  return !req || can(access, req.area, req.action)
}
