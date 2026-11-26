import { useMutation, useQuery } from '@apollo/client/react'
import { useNavigate } from '@tanstack/react-router'
import { signIn } from '@/lib/auth-client'
import { rateLimitMessage, retryAfterFromError } from '@/lib/rate-limit'
import { SetupFormCard, type SetupValues } from './components/SetupFormCard'
import { COMPLETE_SETUP, SETUP_STATUS } from './operations'

/** First-run wizard: exchange the setup token from the API log for the first admin account. */
export function SetupPage() {
  const navigate = useNavigate()
  const { data } = useQuery(SETUP_STATUS, { fetchPolicy: 'network-only' })
  const [completeSetup] = useMutation(COMPLETE_SETUP, { context: { inlineRateLimit: true } })

  async function handleSubmit(values: SetupValues): Promise<string | null> {
    try {
      await completeSetup({ variables: { input: values } })
    } catch (err) {
      const wait = retryAfterFromError(err)
      if (wait !== null) return rateLimitMessage(wait)
      return err instanceof Error ? err.message : 'Setup failed'
    }
    const signedIn = await signIn.email({ email: values.email, password: values.password })
    await navigate({ to: signedIn.error ? '/login' : '/admin/users' })
    return null
  }

  return (
    <>
      <SetupFormCard
        minPasswordLength={data?.setupStatus.minPasswordLength ?? 8}
        onSubmit={handleSubmit}
      />
    </>
  )
}
