import { useMutation, useQuery } from '@apollo/client/react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { RateLimitAlert } from '@/components/RateLimitAlert'
import { Card, CardContent } from '@/components/ui/card'
import { rateLimitMessage, retryAfterFromError } from '@/lib/rate-limit'
import { PASSWORD_POLICY, RESET_PASSWORD, VALIDATE_PASSWORD_RESET_TOKEN } from './operations'
import { ResetPasswordForm } from './ResetPasswordForm'

/** Public page reached only through an Admin's one-time link. */
export function ResetPasswordPage({ token }: { token: string }) {
  const navigate = useNavigate()
  const status = useQuery(VALIDATE_PASSWORD_RESET_TOKEN, {
    variables: { token },
    fetchPolicy: 'network-only',
    context: { inlineRateLimit: true },
  })
  const policy = useQuery(PASSWORD_POLICY)
  const [resetPassword] = useMutation(RESET_PASSWORD, { context: { inlineRateLimit: true } })

  async function submit(newPassword: string): Promise<string | null> {
    try {
      await resetPassword({ variables: { input: { token, newPassword } } })
      await navigate({ to: '/login', search: { notice: 'password-changed' } })
      return null
    } catch (e) {
      const wait = retryAfterFromError(e)
      if (wait !== null) return rateLimitMessage(wait)
      return e instanceof Error ? e.message : 'Could not set the password'
    }
  }

  const limitedFor = retryAfterFromError(status.error)
  const ready = status.data && policy.data
  return (
    <>
      {limitedFor !== null ? (
        <RateLimitAlert seconds={limitedFor} />
      ) : !ready ? (
        <Card>
          <CardContent
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Checking your link…
          </CardContent>
        </Card>
      ) : (
        <ResetPasswordForm
          status={status.data.validatePasswordResetToken}
          policy={policy.data.passwordPolicy}
          onSubmit={submit}
        />
      )}
    </>
  )
}
