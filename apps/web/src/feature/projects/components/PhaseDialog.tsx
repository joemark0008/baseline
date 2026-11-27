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
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { PhaseStatus } from '@/graphql/codegen/graphql'
import { label, message, PHASE_STATUSES, type PhaseData, type Person } from '../lib'
import { ADD_PROJECT_PHASE, PROJECT, UPDATE_PROJECT_PHASE } from '../operations'
import { PersonSelect } from './PersonSelect'

export interface PhaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  members: ReadonlyArray<Person>
  /** Absent to add a phase. */
  phase?: PhaseData | null
}

/** Add a phase, or set a phase's name, owner, dates and status (Managers). */
export function PhaseDialog({ open, onOpenChange, projectId, members, phase }: PhaseDialogProps) {
  const [name, setName] = useState(phase?.name ?? '')
  const [description, setDescription] = useState(phase?.description ?? '')
  const [ownerId, setOwnerId] = useState(phase?.owner?.id ?? '')
  const [startDate, setStartDate] = useState(phase?.startDate ?? '')
  const [endDate, setEndDate] = useState(phase?.endDate ?? '')
  const [status, setStatus] = useState<string>(phase?.status ?? 'UPCOMING')
  const [error, setError] = useState<string | null>(null)
  const [addPhase, adding] = useMutation(ADD_PROJECT_PHASE, { refetchQueries: [PROJECT] })
  const [updatePhase, updating] = useMutation(UPDATE_PROJECT_PHASE, { refetchQueries: [PROJECT] })
  const busy = adding.loading || updating.loading

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (startDate && endDate && endDate < startDate) {
      setError('End date must not be before start date')
      return
    }
    try {
      if (phase) {
        await updatePhase({
          variables: {
            input: {
              id: phase.id,
              name,
              description: description || null,
              ownerId: ownerId || null,
              startDate: startDate || null,
              endDate: endDate || null,
              status: status as PhaseStatus,
            },
          },
        })
        toast.success(`${name} saved`)
      } else {
        await addPhase({
          variables: { input: { projectId, name, description: description || null } },
        })
        toast.success(`Phase ${name} added`)
      }
      onOpenChange(false)
    } catch (err) {
      setError(message(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{phase ? `Edit ${phase.name}` : 'Add a phase'}</DialogTitle>
            <DialogDescription>
              Only this project changes; the standard template stays as it is.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phase-name">Name</Label>
            <Input
              id="phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phase-description">Description</Label>
            <Textarea
              id="phase-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
          {phase ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phase-owner">Owner</Label>
                <PersonSelect
                  id="phase-owner"
                  people={members}
                  value={ownerId}
                  onChange={setOwnerId}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phase-start">Start</Label>
                  <Input
                    id="phase-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phase-end">End</Label>
                  <Input
                    id="phase-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phase-status">Status</Label>
                <NativeSelect
                  id="phase-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {PHASE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </>
          ) : null}
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
              {busy ? 'Saving…' : phase ? 'Save' : 'Add phase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
