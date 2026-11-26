import { Link } from '@tanstack/react-router'
import { BrandMark, PRODUCT_NAME } from '@/components/BrandMark'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type { Access } from '@/lib/access'
import { NavMain } from './NavMain'
import { NavUser, type NavUserProps } from './NavUser'

export interface AppSidebarProps {
  access: Access | null
  user: Omit<NavUserProps, 'onSignOut'>
  onSignOut: () => void
}

/** The inset sidebar: brand header, grouped navigation, user footer. A drawer on phones. */
export function AppSidebar({ access, user, onSignOut }: AppSidebarProps) {
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                to="/dashboard"
                activeOptions={{ exact: true }}
                onClick={() => setOpenMobile(false)}
              >
                <div
                  className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground"
                  aria-hidden
                >
                  {PRODUCT_NAME.charAt(0).toUpperCase()}
                </div>
                <BrandMark className="truncate text-sm" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain access={access} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser name={user.name} email={user.email} onSignOut={onSignOut} />
      </SidebarFooter>
    </Sidebar>
  )
}
