import { meets, type Access, type Requirement } from './access'

export type GuardDecision = { allow: true } | { allow: false; redirectTo: '/login' | '/dashboard' }

/** Pages that need a permission, by path prefix. Add a row when a feature adds a protected page. */
export const ROUTE_PERMISSIONS: Array<{ prefix: string; requires: Requirement }> = [
  { prefix: '/admin/users', requires: { area: 'users', action: 'view' } },
  // Most specific first: the first matching prefix wins.
  { prefix: '/settings/roles/new', requires: { area: 'roles', action: 'add' } },
  { prefix: '/settings/roles', requires: { area: 'roles', action: 'view' } },
]

/** Pure route-guard logic used by `_protected.tsx` `beforeLoad`; tested without the router. */
export function guardProtected(
  session: object | null,
  access: Access | null,
  pathname: string,
): GuardDecision {
  if (!session) return { allow: false, redirectTo: '/login' }
  const rule = ROUTE_PERMISSIONS.find((r) => pathname.startsWith(r.prefix))
  if (rule && !meets(access, rule.requires)) return { allow: false, redirectTo: '/dashboard' }
  return { allow: true }
}
