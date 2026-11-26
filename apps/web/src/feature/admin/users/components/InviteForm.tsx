import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'

export interface InviteFormProps {
  /** Roles the inviter may invite into, as the server lists them (default first). */
  roles: ReadonlyArray<{ id: string; name: string }>
  onInvite: (
    email: string,
    roleId: string,
  ) => Promise<{ inviteUrl: string; emailSent: boolean } | { error: string }>
}

type InviteOutcome = { inviteUrl: string; emailSent: boolean; email: string } | { error: string }

export function InviteForm({ roles, onInvite }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')
  const [result, setResult] = useState<InviteOutcome | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const invitee = email.trim()
    const outcome = await onInvite(invitee, roleId)
    setResult('error' in outcome ? outcome : { ...outcome, email: invitee })
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
          <AlertTitle>
            {result.emailSent ? `Invitation emailed to ${result.email}` : 'Invitation created'}
          </AlertTitle>
          <AlertDescription className="break-all">
            {result.emailSent
              ? 'They can also use this link (it is shown once): '
              : 'Send this link to the invitee (it is shown once): '}
            <code>{result.inviteUrl}</code>
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
