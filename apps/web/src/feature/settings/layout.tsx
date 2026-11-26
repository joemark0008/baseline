import { Link, Outlet, useRouteContext } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { can } from '@/lib/access'

/** Settings shell: section links, then the section. Sections the person can't use are hidden. */
export function SettingsLayout() {
  const { access } = useRouteContext({ from: '/_protected' })
  const sections = [
    { to: '/settings' as const, label: 'Account', show: true, exact: true },
    { to: '/settings/roles' as const, label: 'Roles', show: can(access, 'roles', 'view') },
    {
      to: '/settings/roles/history' as const,
      label: 'History',
      show: can(access, 'roles', 'view'),
      exact: true,
    },
  ]
  return (
    <>
      <PageHeader title="Settings" description="Your account and who can do what." />
      <nav
        aria-label="Settings sections"
        className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
      >
        {sections
          .filter((s) => s.show)
          .map((s) => (
            <Link
              key={s.to}
              to={s.to}
              activeOptions={{ exact: s.exact ?? false }}
              className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
              activeProps={{ className: 'border-primary font-medium text-foreground' }}
            >
              {s.label}
            </Link>
          ))}
      </nav>
      <Outlet />
    </>
  )
}
