import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface PasswordPolicy {
  minLength: number
  maxLength: number
}

export interface ResetPasswordFormProps {
  /** From the server's token check. */
  status: { valid: boolean; name: string | null }
  policy: PasswordPolicy
  /** Resolves to an error message, or null on success. */
  onSubmit: (newPassword: string) => Promise<string | null>
}

export const INVALID_LINK = 'This reset link is no longer valid. Ask an admin for a new one.'

export function ResetPasswordForm({ status, policy, onSubmit }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError("The passwords don't match.")
      return
    }
    setBusy(true)
    setError(await onSubmit(password))
    setBusy(false)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {status.valid ? `Set a new password for ${status.name}` : 'Reset password'}
        </CardTitle>
        {status.valid ? (
          <CardDescription>
            {policy.minLength}–{policy.maxLength} characters.
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {!status.valid ? (
          <Alert variant="destructive">
            <AlertDescription>{INVALID_LINK}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={policy.minLength}
                maxLength={policy.maxLength}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={busy}>
              Set new password
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
