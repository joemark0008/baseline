import { createFileRoute } from '@tanstack/react-router'
import { InvitePage } from '@/feature/auth/invite'

export const Route = createFileRoute('/_public/invite')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
    email: typeof search.email === 'string' ? search.email : '',
  }),
  component: InviteRoute,
})

function InviteRoute() {
  const { token, email } = Route.useSearch()
  return <InvitePage token={token} email={email} />
}
