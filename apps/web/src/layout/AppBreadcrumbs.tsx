import { Link, useLocation } from '@tanstack/react-router'
import { Fragment } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { Access } from '@/lib/access'
import { breadcrumbs } from '@/lib/nav-model'

/** Where the person is: section › page › detail. Only the current page shows on phones. */
export function AppBreadcrumbs({ access }: { access: Access | null }) {
  const { pathname } = useLocation()
  const trail = breadcrumbs(pathname, access)
  if (trail.length === 0) return null
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {trail.map((crumb, i) => (
          <Fragment key={`${i}-${crumb.label}`}>
            {i > 0 && <BreadcrumbSeparator className="hidden md:block" />}
            <BreadcrumbItem className={crumb.to ? 'hidden md:block' : undefined}>
              {crumb.to ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.to} activeOptions={{ exact: true }}>
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
