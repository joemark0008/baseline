import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/layout/AppLayout'
import { guardProtected } from '@/lib/guards'

/** Pathless guard: runs before any protected screen mounts. Add page permissions in lib/guards.ts. */
export const Route = createFileRoute('/_protected')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.getSession()
    const access = session ? await context.getAccess() : null
    const decision = guardProtected(session, access, location.pathname)
    if (!decision.allow) throw redirect({ to: decision.redirectTo })
    return { session, access }
  },
  component: AppLayout,
})
