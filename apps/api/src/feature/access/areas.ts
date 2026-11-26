import { invitesArea } from '../invites/invites.access.js'
import { rolesArea } from '../roles/roles.access.js'
import { usersArea } from '../users/users.access.js'
import type { AreaDef } from './define-area.js'

export function assertUniqueKeys(areas: readonly AreaDef[]): void {
  const seen = new Set<string>()
  for (const a of areas) {
    if (seen.has(a.key)) throw new Error(`Duplicate area key "${a.key}"`)
    seen.add(a.key)
  }
}

/**
 * The permission catalogue: every protectable area, in the order the roles grid shows them.
 * To protect a new feature, declare its area in `<feature>.access.ts` and add it here.
 */
export const ACCESS_AREAS = [usersArea, invitesArea, rolesArea] as const
assertUniqueKeys(ACCESS_AREAS)

export type AreaKey = (typeof ACCESS_AREAS)[number]['key']

export function findArea(key: string): AreaDef | undefined {
  return ACCESS_AREAS.find((a) => a.key === key)
}
