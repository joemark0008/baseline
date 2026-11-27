import { useMutation } from '@apollo/client/react'
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
import { Textarea } from '@/components/ui/textarea'
import { message, type StakeholderData } from '../lib'
import { ADD_PROJECT_STAKEHOLDER, PROJECT, UPDATE_PROJECT_STAKEHOLDER } from '../operations'

/** FR-018: a hospital or vendor contact; being listed grants no access. */
export function StakeholderDialog({
  projectId,
  stakeholder,
  onOpenChange,
}: {
  projectId: string
  stakeholder?: StakeholderData | null
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(stakeholder?.name ?? '')
  const [organization, setOrganization] = useState(stakeholder?.organization ?? '')
  const [role, setRole] = useState(stakeholder?.role ?? '')
  const [email, setEmail] = useState(stakeholder?.email ?? '')
  const [phone, setPhone] = useState(stakeholder?.phone ?? '')
  const [notes, setNotes] = useState(stakeholder?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [add, adding] = useMutation(ADD_PROJECT_STAKEHOLDER, { refetchQueries: [PROJECT] })
  const [update, updating] = useMutation(UPDATE_PROJECT_STAKEHOLDER, { refetchQueries: [PROJECT] })
  const busy = adding.loading || updating.loading

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const fields = {
      name,
      organization,
      role,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    }
    try {
      if (stakeholder) {
        await update({ variables: { input: { id: stakeholder.id, ...fields } } })
        toast.success(`${name} saved`)
      } else {
        await add({ variables: { input: { projectId, ...fields } } })
        toast.success(`${name} added`)
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
            <DialogTitle>{stakeholder ? 'Edit stakeholder' : 'Add stakeholder'}</DialogTitle>
            <DialogDescription>
              A contact for coordination. Listing someone here does not give them access to the
              project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sh-name">Name</Label>
            <Input
              id="sh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sh-org">Organization</Label>
              <Input
                id="sh-org"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
                maxLength={120}
                placeholder="Hospital or vendor"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sh-role">Implementation role</Label>
              <Input
                id="sh-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                maxLength={120}
                placeholder="e.g. Department lead"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sh-email">Email</Label>
              <Input
                id="sh-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sh-phone">Phone</Label>
              <Input
                id="sh-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sh-notes">Notes</Label>
            <Textarea
              id="sh-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={2000}
            />
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
              {busy ? 'Saving…' : stakeholder ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
