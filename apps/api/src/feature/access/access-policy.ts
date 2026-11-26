import { BadRequestException } from '@nestjs/common'
import { ACTIONS, isAction, type Action } from './actions.js'
import { ACCESS_AREAS } from './areas.js'
import { requiredActions } from './capabilities.js'
import type { AreaDef } from './define-area.js'
import type { RoleKind } from './role-kind.js'

export interface Grant {
  area: string
  action: string
}

/** `"area:action"`, e.g. `"users:view"`. */
export type PermissionKey = `${string}:${string}`

export function permissionKey(area: string, action: string): PermissionKey {
  return `${area}:${action}`
}

function offers(area: AreaDef, action: string): boolean {
  return isAction(action) && area.actions[action] !== undefined
}

/**
 * What a role may do. Admin: every permission the catalogue offers (so new features are covered
 * automatically). Others: their stored grants, ignoring any that the catalogue no longer offers.
 */
export function effectivePermissions(
  kind: RoleKind,
  grants: readonly Grant[],
  areas: readonly AreaDef[] = ACCESS_AREAS,
): Set<PermissionKey> {
  const out = new Set<PermissionKey>()
  for (const area of areas) {
    for (const action of ACTIONS) {
      if (!offers(area, action)) continue
      const granted =
        kind === 'ADMIN' || grants.some((g) => g.area === area.key && g.action === action)
      if (granted) out.add(permissionKey(area.key, action))
    }
  }
  return out
}

/**
 * Validates grants before they are stored: every grant must exist in the catalogue, Add/Edit/
 * Delete imply View, duplicates are dropped, and the result is in catalogue order.
 */
export function normalizeGrants(
  grants: readonly Grant[],
  areas: readonly AreaDef[] = ACCESS_AREAS,
): Grant[] {
  const wanted = new Set<PermissionKey>()
  for (const g of grants) {
    const area = areas.find((a) => a.key === g.area)
    if (!area || !offers(area, g.action)) {
      throw new BadRequestException(`Unknown permission ${g.area}:${g.action}`)
    }
    wanted.add(permissionKey(g.area, g.action))
    for (const req of requiredActions(area, g.action as Action))
      wanted.add(permissionKey(g.area, req))
  }
  const out: Grant[] = []
  for (const area of areas) {
    for (const action of ACTIONS) {
      if (wanted.has(permissionKey(area.key, action))) out.push({ area: area.key, action })
    }
  }
  return out
}
