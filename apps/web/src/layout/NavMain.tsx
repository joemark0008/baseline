import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type { Access } from '@/lib/access'
import { activeItem, linkHolds, visibleNav } from '@/lib/nav-model'

/** Grouped navigation; sections with sub-pages expand, and the one holding the page starts open. */
export function NavMain({ access }: { access: Access | null }) {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  const close = () => setOpenMobile(false)
  // The router's own aria-current is prefix-based; nav-model decides what is current.
  const exact = { exact: true } as const

  return visibleNav(access).map(({ group, links }) => (
    <SidebarGroup key={group}>
      <SidebarGroupLabel>{group}</SidebarGroupLabel>
      <SidebarMenu>
        {links.map((link) => {
          const holds = linkHolds(link, pathname)
          if (!link.items) {
            return (
              <SidebarMenuItem key={link.to}>
                <SidebarMenuButton asChild isActive={holds} tooltip={link.label}>
                  <Link to={link.to} activeOptions={exact} onClick={close}>
                    <link.icon aria-hidden />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }
          const current = activeItem(link, pathname)
          return (
            <Collapsible key={link.to} asChild defaultOpen={holds}>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={link.label}>
                  <Link to={link.to} activeOptions={exact} onClick={close}>
                    <link.icon aria-hidden />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
                <CollapsibleTrigger asChild>
                  <SidebarMenuAction
                    aria-label={`Toggle ${link.label}`}
                    className="data-[state=open]:rotate-90"
                  >
                    <ChevronRight aria-hidden />
                  </SidebarMenuAction>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {link.items.map((item) => (
                      <SidebarMenuSubItem key={item.to}>
                        <SidebarMenuSubButton asChild isActive={item === current}>
                          <Link to={item.to} activeOptions={exact} onClick={close}>
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  ))
}
