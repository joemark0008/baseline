import { Outlet, useNavigate, useRouteContext } from '@tanstack/react-router'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { signOut } from '@/lib/auth-client'
import { readSidebarOpen } from '@/lib/sidebar-state'
import { AppBreadcrumbs } from './AppBreadcrumbs'
import { AppSidebar } from './AppSidebar'

/** App shell (the catalog's inset sidebar layout): sidebar, then a top bar and the routed page. */
export function AppLayout() {
  const { current } = useCurrentUser()
  const navigate = useNavigate()
  const { access } = useRouteContext({ from: '/_protected' })
  if (!current) return null // beforeLoad already guaranteed a session; this only covers the first paint
  const onSignOut = async () => {
    await signOut()
    await navigate({ to: '/login' })
  }
  return (
    <SidebarProvider defaultOpen={readSidebarOpen(document.cookie)}>
      <AppSidebar
        access={access}
        user={{ name: current.user.name, email: current.user.email }}
        onSignOut={onSignOut}
      />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <AppBreadcrumbs access={access} />
        </header>
        <div className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-6 p-4 pt-0 sm:p-6 sm:pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
