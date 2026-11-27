import { useMutation, useQuery } from '@apollo/client/react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import type { ProjectRole } from '@/graphql/codegen/graphql'
import { message } from '../lib'
import {
  ADD_PROJECT_MEMBER,
  INVITE_PROJECT_MEMBER,
  PROJECT,
  PROJECT_MEMBER_CANDIDATES,
} from '../operations'

/** Add a participant: pick an existing account, or enter an email (an existing account joins now, anyone else is invited). */
export function MemberDialog({
  projectId,
  onOpenChange,
}: {
  projectId: string
  onOpenChange: (open: boolean) => void
}) {
  const [mode, setMode] = useState<'existing' | 'email'>('existing')
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [error, setError] = useState<string | null>(null)
  const candidates = useQuery(PROJECT_MEMBER_CANDIDATES, {
    variables: { projectId, search },
    skip: mode !== 'existing',
  })
  const [addMember, adding] = useMutation(ADD_PROJECT_MEMBER, { refetchQueries: [PROJECT] })
  const [invite, inviting] = useMutation(INVITE_PROJECT_MEMBER, { refetchQueries: [PROJECT] })
  const busy = adding.loading || inviting.loading

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (mode === 'existing') {
        if (!userId) {
          setError('Choose a person')
          return
        }
        await addMember({ variables: { projectId, userId, role: role as ProjectRole } })
        toast.success('Member added')
      } else {
        const { data } = await invite({
          variables: { input: { projectId, email, role: role as ProjectRole } },
        })
        const result = data?.inviteProjectMember
        toast.success(
          result?.joinedUserId
            ? `${email} already had an account and joined the project`
            : result?.emailSent
              ? `Invitation emailed to ${email}`
              : `Invite created for ${email}; the email could not be sent, share the link from Admin › Users`,
        )
      }
      onOpenChange(false)
    } catch (err) {
      setError(message(err))
    }
  }

  return (
    <Dialog open onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add a participant</DialogTitle>
            <DialogDescription>
              Hospital and vendor people work in the same project. Managers tailor the plan; Members
              work in it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2" role="group" aria-label="How to add">
            <Button
              type="button"
              size="sm"
              variant={mode === 'existing' ? 'secondary' : 'ghost'}
              aria-pressed={mode === 'existing'}
              onClick={() => setMode('existing')}
            >
              Existing account
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'email' ? 'secondary' : 'ghost'}
              aria-pressed={mode === 'email'}
              onClick={() => setMode('email')}
            >
              By email
            </Button>
          </div>
          {mode === 'existing' ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="member-search">Search people</Label>
                <Input
                  id="member-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or email"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="member-user">Person</Label>
                <NativeSelect
                  id="member-user"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                >
                  <option value="">{candidates.loading ? 'Loading…' : 'Choose a person'}</option>
                  {(candidates.data?.projectMemberCandidates ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.email}
                    </option>
                  ))}
                </NativeSelect>
                {candidates.error ? (
                  <p className="text-xs text-destructive">{candidates.error.message}</p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Someone without an account gets an invitation email that creates one.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-role">Project role</Label>
            <NativeSelect id="member-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="MEMBER">Member</option>
              <option value="MANAGER">Manager</option>
            </NativeSelect>
          </div>
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : mode === 'existing' ? 'Add member' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
