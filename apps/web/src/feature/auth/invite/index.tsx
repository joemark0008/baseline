import { useMutation, useQuery } from '@apollo/client/react'
import { useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { RateLimitAlert } from '@/components/RateLimitAlert'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/lib/auth-client'
import { rateLimitMessage, retryAfterFromError, retryAfterFromResponse } from '@/lib/rate-limit'
import { ACCEPT_INVITE, VALIDATE_INVITE } from './operations'

export interface InvitePageProps {
  token: string
  email: string
}

/** Validates the token, signs the person up on the invited email (locked), then burns the invite. */
export function InvitePage({ token, email }: InvitePageProps) {
  const navigate = useNavigate()
  const {
    data,
    loading,
    error: queryError,
  } = useQuery(VALIDATE_INVITE, {
    variables: { token },
    fetchPolicy: 'network-only',
    context: { inlineRateLimit: true },
  })
  const [acceptInvite] = useMutation(ACCEPT_INVITE, { context: { inlineRateLimit: true } })
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const invite = data?.validateInviteToken
  const invitedEmail = invite?.email ?? email
  const limitedFor = retryAfterFromError(queryError)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const refusal = { retryAfter: null as number | null }
    const signedUp = await signUp.email(
      { email: invitedEmail, password, name },
      {
        onError: (ctx: { response: Response }) => {
          if (ctx.response.status === 429)
            refusal.retryAfter = retryAfterFromResponse(ctx.response, 60)
        },
      },
    )
    if (signedUp.error) {
      setError(
        signedUp.error.status === 429
          ? rateLimitMessage(refusal.retryAfter ?? 60)
          : (signedUp.error.message ?? 'Sign-up failed'),
      )
      setBusy(false)
      return
    }
    try {
      await acceptInvite({ variables: { token } })
      await navigate({ to: '/auth/callback' })
    } catch (err) {
      const wait = retryAfterFromError(err)
      setError(
        wait !== null
          ? rateLimitMessage(wait)
          : err instanceof Error
            ? err.message
            : 'Could not accept the invite',
      )
      setBusy(false)
    }
  }

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Accept your invitation</CardTitle>
          <CardDescription>Create your account to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Checking your invitation…</p>
          ) : limitedFor !== null ? (
            <RateLimitAlert seconds={limitedFor} />
          ) : !invite?.valid ? (
            <Alert variant="destructive">
              <AlertTitle>This invitation is not valid</AlertTitle>
              <AlertDescription>
                It may have expired or already been used. Ask an admin for a new one.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={invitedEmail} readOnly />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" disabled={busy}>
                {busy ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  )
}
