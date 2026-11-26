import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'

export interface InviteFormProps {
  /** Roles the inviter may invite into, as the server lists them (default first). */
  roles: ReadonlyArray<{ id: string; name: string }>
  onInvite: (email: string, roleId: string) => Promise<{ inviteUrl: string } | { error: string }>
}

export function InviteForm({ roles, onInvite }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')
  const [result, setResult] = useState<{ inviteUrl: string } | { error: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setResult(await onInvite(email.trim(), roleId))
    setBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2 sm:w-40">
          <Label htmlFor="invite-role">Role</Label>
          <NativeSelect id="invite-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Inviting…' : 'Invite'}
        </Button>
      </div>
      {result && 'inviteUrl' in result ? (
        <Alert variant="success">
          <AlertTitle>Invitation created</AlertTitle>
          <AlertDescription className="break-all">
            Send this link to the invitee (it is shown once): <code>{result.inviteUrl}</code>
          </AlertDescription>
        </Alert>
      ) : result && 'error' in result ? (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}
