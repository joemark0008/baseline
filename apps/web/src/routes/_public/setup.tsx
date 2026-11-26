import { createFileRoute, redirect } from '@tanstack/react-router'
import { SetupPage } from '@/feature/setup'

export const Route = createFileRoute('/_public/setup')({
  beforeLoad: async ({ context }) => {
    if (await context.getSetupComplete()) throw redirect({ to: '/login' })
  },
  component: SetupPage,
})
