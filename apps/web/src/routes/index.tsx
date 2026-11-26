import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    if (!(await context.getSetupComplete())) throw redirect({ to: '/setup' })
    const session = await context.getSession()
    throw redirect({ to: session ? '/dashboard' : '/login' })
  },
})
