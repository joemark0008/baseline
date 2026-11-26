import { LayoutDashboard, Settings, Users, type LucideIcon } from 'lucide-react'
import type { FileRouteTypes } from '../routeTree.gen'
import type { Requirement } from './access'

export type NavGroup = 'Main' | 'Admin'
export const NAV_GROUP_ORDER: NavGroup[] = ['Main', 'Admin']

type RoutePath = FileRouteTypes['to']

/** A page under an expandable section, e.g. Settings › Roles. */
export interface NavSubLink {
  label: string
  to: RoutePath
  /** Hidden unless the person's role has this permission. */
  requires?: Requirement
  /** Active only on this exact path; otherwise any path below it counts too. */
  exact?: boolean
}

export interface NavLink {
  label: string
  /** Typed against the generated route tree: a dead link is a compile error. */
  to: RoutePath
  icon: LucideIcon
  group: NavGroup
  /** Hidden unless the person's role has this permission. */
  requires?: Requirement
  /** Sub-pages; when present the entry is an expandable section. */
  items?: NavSubLink[]
}

/** The one place navigation is defined: the sidebar, mobile drawer and breadcrumbs read it. */
export const protectedNavLinks: NavLink[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, group: 'Main' },
  {
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    group: 'Main',
    items: [
      { label: 'Account', to: '/settings', exact: true },
      { label: 'Roles', to: '/settings/roles', requires: { area: 'roles', action: 'view' } },
      {
        label: 'History',
        to: '/settings/roles/history',
        exact: true,
        requires: { area: 'roles', action: 'view' },
      },
    ],
  },
  {
    label: 'Users',
    to: '/admin/users',
    icon: Users,
    group: 'Admin',
    requires: { area: 'users', action: 'view' },
  },
]

/** Extra last breadcrumb for detail pages that aren't navigation entries; never a raw id. */
export const DETAIL_CRUMBS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /^\/settings\/roles\/new$/, label: 'New role' },
  { pattern: /^\/settings\/roles\/[^/]+$/, label: 'Edit role' },
]
