import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface SetupValues {
  token: string
  name: string
  email: string
  password: string
}

export interface SetupFormCardProps {
  minPasswordLength: number
  /** Returns an error message to show, or null on success. */
  onSubmit: (values: SetupValues) => Promise<string | null>
}

export function SetupFormCard({ minPasswordLength, onSubmit }: SetupFormCardProps) {
  const [values, setValues] = useState<SetupValues>({
    token: '',
    name: '',
    email: '',
    password: '',
  })
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (key: keyof SetupValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (values.password.length < minPasswordLength) {
      setError(`Password must be at least ${minPasswordLength} characters.`)
      return
    }
    if (values.password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    setError(await onSubmit(values))
    setBusy(false)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set up your workspace</CardTitle>
        <CardDescription>Create the first admin account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="token">Setup token</Label>
            <Input
              id="token"
              autoComplete="off"
              value={values.token}
              onChange={set('token')}
              aria-describedby="token-hint"
              required
            />
            <p id="token-hint" className="text-xs text-muted-foreground">
              Find it in the API log (“Setup token: …”).
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoComplete="name"
              value={values.name}
              onChange={set('name')}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={set('email')}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={set('password')}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating admin…' : 'Create admin'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
