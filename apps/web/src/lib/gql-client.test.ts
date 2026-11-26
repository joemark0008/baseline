import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { handleLinkError } from './gql-client'

const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn() } }))
vi.mock('sonner', () => ({ toast }))

const operation = (context: Record<string, unknown> = {}) => ({ getContext: () => context })
const gqlError = (extensions: Record<string, unknown>) =>
  new CombinedGraphQLErrors({ errors: [{ message: 'x', extensions }] })

describe('handleLinkError', () => {
  const redirect = vi.fn()
  beforeEach(() => vi.clearAllMocks())

  it('toasts a rate-limit refusal and never redirects', () => {
    handleLinkError(
      { error: gqlError({ code: 'TOO_MANY_REQUESTS', retryAfter: 12 }), operation: operation() },
      redirect,
    )
    expect(toast.error).toHaveBeenCalledWith('Too many attempts. Try again in 12 seconds.')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('leaves the notice to screens that render it inline', () => {
    handleLinkError(
      {
        error: gqlError({ code: 'TOO_MANY_REQUESTS', retryAfter: 12 }),
        operation: operation({ inlineRateLimit: true }),
      },
      redirect,
    )
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('still redirects on auth errors', () => {
    handleLinkError(
      { error: gqlError({ code: 'UNAUTHENTICATED' }), operation: operation() },
      redirect,
    )
    expect(redirect).toHaveBeenCalledWith('/login')
    expect(toast.error).not.toHaveBeenCalled()
  })
})
