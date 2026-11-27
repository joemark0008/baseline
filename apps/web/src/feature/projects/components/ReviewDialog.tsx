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
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ReviewOutcome } from '@/graphql/codegen/graphql'
import { message, type DeliverableData } from '../lib'
import { PROJECT, REVIEW_PROJECT_DELIVERABLE } from '../operations'

/** The reviewer (or a Manager) records approval or requests changes (FR-016, US4/AC4). */
export function ReviewDialog({
  deliverable,
  onOpenChange,
}: {
  deliverable: DeliverableData
  onOpenChange: (open: boolean) => void
}) {
  const [outcome, setOutcome] = useState('APPROVED')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [review, { loading }] = useMutation(REVIEW_PROJECT_DELIVERABLE, {
    refetchQueries: [PROJECT],
  })

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await review({
        variables: {
          input: { id: deliverable.id, outcome: outcome as ReviewOutcome, note: note || null },
        },
      })
      toast.success(
        outcome === 'APPROVED'
          ? `${deliverable.title} approved`
          : `Changes requested on ${deliverable.title}`,
      )
      onOpenChange(false)
    } catch (err) {
      setError(message(err))
    }
  }

  return (
    <Dialog open onOpenChange={(next) => (loading ? null : onOpenChange(next))}>
      <DialogContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Review {deliverable.title}</DialogTitle>
            <DialogDescription>
              Approval marks the deliverable ready; requesting changes sends it back to in progress.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="review-outcome">Outcome</Label>
            <NativeSelect
              id="review-outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="APPROVED">Approve</option>
              <option value="CHANGES_REQUESTED">Request changes</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="review-note">Note</Label>
            <Textarea
              id="review-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
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
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Record review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
