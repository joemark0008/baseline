import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { NotFound } from '@/components/NotFound'
import { Toaster } from '@/components/ui/sonner'
import type { RouterAuthContext } from '@/context/auth'
import { PublicLayout } from '@/layout/PublicLayout'

export const Route = createRootRouteWithContext<RouterAuthContext>()({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
  notFoundComponent: () => (
    <PublicLayout>
      <NotFound />
    </PublicLayout>
  ),
})
