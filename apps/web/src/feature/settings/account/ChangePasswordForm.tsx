import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PasswordPolicy } from '@/feature/auth/reset-password/ResetPasswordForm'

export interface ChangePasswordFormProps {
  policy: PasswordPolicy
  /** Resolves to an error message, or null on success. */
  onSubmit: (currentPassword: string, newPassword: string) => Promise<string | null>
}

export function ChangePasswordForm({ policy, onSubmit }: ChangePasswordFormProps) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setDone(false)
    if (next !== confirm) {
      setError("The passwords don't match.")
      return
    }
    setBusy(true)
    const failed = await onSubmit(current, next)
    setBusy(false)
    setError(failed)
    if (!failed) {
      setDone(true)
      setCurrent('')
      setNext('')
      setConfirm('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={policy.minLength}
          maxLength={policy.maxLength}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          {policy.minLength}–{policy.maxLength} characters.
        </p>
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
      {done ? (
        <Alert role="status">
          <AlertDescription>Password changed. Other devices have been signed out.</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={busy} className="self-start">
        Change password
      </Button>
    </form>
  )
}
