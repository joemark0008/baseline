import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client'
import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { ErrorLink } from '@apollo/client/link/error'
import { toast } from 'sonner'
import { API_URL } from './env'
import { rateLimitMessage, retryAfterFromError } from './rate-limit'

type Redirect = (url: string) => void

/** Where the browser is sent on auth errors. Add a /403 route or change this handler. */
function redirectForAuthError(message: string, code: unknown, redirect: Redirect): void {
  if (code === 'UNAUTHENTICATED' || message === 'Unauthorized') {
    redirect('/login')
  } else if (code === 'FORBIDDEN' || message === 'Forbidden resource') {
    redirect('/403')
  }
}

/** Operations run with `context: { inlineRateLimit: true }` show the refusal themselves. */
export function handleLinkError(
  {
    error,
    operation,
  }: {
    error: unknown
    operation: { getContext(): Record<string, unknown> }
  },
  redirect: Redirect = (url) => window.location.assign(url),
): void {
  if (!CombinedGraphQLErrors.is(error)) return
  const retryAfter = retryAfterFromError(error)
  if (retryAfter !== null) {
    // A rate-limit refusal never signs anyone out; tell them how long to wait.
    if (!operation.getContext().inlineRateLimit) toast.error(rateLimitMessage(retryAfter))
    return
  }
  for (const e of error.errors) redirectForAuthError(e.message, e.extensions?.code, redirect)
}

const errorLink = new ErrorLink((ctx) => handleLinkError(ctx))

export const gqlClient = new ApolloClient({
  link: ApolloLink.from([
    errorLink,
    new HttpLink({ uri: `${API_URL}/graphql`, credentials: 'include' }),
  ]),
  cache: new InMemoryCache(),
})
