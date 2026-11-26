import { meets, type Access } from './access'
import {
  DETAIL_CRUMBS,
  NAV_GROUP_ORDER,
  protectedNavLinks,
  type NavGroup,
  type NavLink,
  type NavSubLink,
} from './navigation'

export interface NavGroupView {
  group: NavGroup
  links: NavLink[]
}

export interface Crumb {
  label: string
  /** Absent on the last crumb (the current page). */
  to?: string
}

/** Whether `pathname` is `to`, or (unless `exact`) any page below it. */
export function isActive(to: string, exact: boolean | undefined, pathname: string): boolean {
  return pathname === to || (!exact && pathname.startsWith(`${to}/`))
}

/** The navigation this person may see: hidden items, empty sections and empty groups removed. */
export function visibleNav(access: Access | null | undefined): NavGroupView[] {
  const links = protectedNavLinks
    .filter((l) => meets(access, l.requires))
    .map((l) => (l.items ? { ...l, items: l.items.filter((i) => meets(access, i.requires)) } : l))
    .filter((l) => !l.items || l.items.length > 0)
  return NAV_GROUP_ORDER.map((group) => ({
    group,
    links: links.filter((l) => l.group === group),
  })).filter((g) => g.links.length > 0)
}

/** The sub-page that holds `pathname`: the longest matching one wins (History over Roles). */
export function activeItem(link: NavLink, pathname: string): NavSubLink | undefined {
  return (link.items ?? [])
    .filter((i) => isActive(i.to, i.exact, pathname))
    .sort((a, b) => b.to.length - a.to.length)[0]
}

/** Whether a link, or one of its sub-pages, holds `pathname`. */
export function linkHolds(link: NavLink, pathname: string): boolean {
  return link.items ? !!activeItem(link, pathname) : isActive(link.to, false, pathname)
}

/** Section › page › detail for `pathname`; the last crumb has no link. */
export function breadcrumbs(pathname: string, access: Access | null | undefined): Crumb[] {
  for (const { links } of visibleNav(access)) {
    for (const link of links) {
      if (!linkHolds(link, pathname)) continue
      const item = activeItem(link, pathname)
      const trail: Crumb[] = item
        ? [
            { label: link.label, to: link.to },
            { label: item.label, to: item.to },
          ]
        : [{ label: link.label, to: link.to }]
      const page = item?.to ?? link.to
      const detail = pathname !== page && DETAIL_CRUMBS.find((d) => d.pattern.test(pathname))
      if (detail) trail.push({ label: detail.label })
      trail[trail.length - 1] = { label: trail[trail.length - 1].label }
      return trail
    }
  }
  return []
}
