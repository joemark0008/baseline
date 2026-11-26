import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginPage } from '@/feature/auth/login'

export const Route = createFileRoute('/_public/login')({
  validateSearch: (search: Record<string, unknown>): { notice?: 'password-changed' } =>
    search.notice === 'password-changed' ? { notice: 'password-changed' } : {},
  beforeLoad: async ({ context }) => {
    if (!(await context.getSetupComplete())) throw redirect({ to: '/setup' })
    if (await context.getSession()) throw redirect({ to: '/dashboard' })
  },
  component: LoginRoute,
})

function LoginRoute() {
  const { notice } = Route.useSearch()
  return <LoginPage notice={notice} />
}
