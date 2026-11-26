import { useNavigate } from '@tanstack/react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GOOGLE_AUTH_ENABLED } from '@/lib/env'
import { signIn } from '@/lib/auth-client'
import { rateLimitMessage, retryAfterFromResponse } from '@/lib/rate-limit'
import { LoginFormCard } from './components/LoginFormCard'

const SIGN_IN_WAIT_FALLBACK_SECONDS = 60

export function LoginPage({ notice }: { notice?: 'password-changed' } = {}) {
  const navigate = useNavigate()

  async function handleSubmit(identifier: string, password: string): Promise<string | null> {
    // The sign-in system answers a refusal with 429 and X-Retry-After (exposed through CORS).
    const refusal = { retryAfter: null as number | null }
    const fetchOptions = {
      onError: (ctx: { response: Response }) => {
        if (ctx.response.status === 429) {
          refusal.retryAfter = retryAfterFromResponse(ctx.response, SIGN_IN_WAIT_FALLBACK_SECONDS)
        }
      },
    }
    const result = identifier.includes('@')
      ? await signIn.email({ email: identifier, password }, fetchOptions)
      : await signIn.username({ username: identifier, password }, fetchOptions)
    if (result.error) {
      if (result.error.status === 429) {
        return rateLimitMessage(refusal.retryAfter ?? SIGN_IN_WAIT_FALLBACK_SECONDS)
      }
      return result.error.message ?? 'Sign-in failed'
    }
    await navigate({ to: '/auth/callback' })
    return null
  }

  return (
    <>
      {notice === 'password-changed' ? (
        <Alert role="status">
          <AlertDescription>Password changed. Sign in with your new password.</AlertDescription>
        </Alert>
      ) : null}
      <LoginFormCard
        onSubmit={handleSubmit}
        onGoogle={
          GOOGLE_AUTH_ENABLED
            ? () =>
                void signIn.social({
                  provider: 'google',
                  callbackURL: `${window.location.origin}/auth/callback`,
                })
            : undefined
        }
      />
    </>
  )
}
