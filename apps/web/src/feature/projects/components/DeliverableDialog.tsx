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
import type { DeliverableKind, DeliverableStatus } from '@/graphql/codegen/graphql'
import {
  DELIVERABLE_STATUSES,
  label,
  message,
  type DeliverableData,
  type ProjectData,
} from '../lib'
import { ADD_PROJECT_DELIVERABLE, PROJECT, UPDATE_PROJECT_DELIVERABLE } from '../operations'
import { PersonSelect } from './PersonSelect'

export interface DeliverableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectData
  phaseId: string
  /** Absent to add. */
  deliverable?: DeliverableData | null
}

type LinkDraft = { label: string; url: string }

/** Add or edit a phase deliverable or data-readiness item, with links to documents kept elsewhere (FR-016). */
export function DeliverableDialog({
  open,
  onOpenChange,
  project,
  phaseId,
  deliverable,
}: DeliverableDialogProps) {
  const members = project.members.map((m) => m.user)
  const [title, setTitle] = useState(deliverable?.title ?? '')
  const [kind, setKind] = useState<string>(deliverable?.kind ?? 'OUTPUT')
  const [ownerId, setOwnerId] = useState(deliverable?.owner?.id ?? '')
  const [reviewerId, setReviewerId] = useState(deliverable?.reviewer?.id ?? '')
  const [dueDate, setDueDate] = useState(deliverable?.dueDate ?? '')
  const [status, setStatus] = useState<string>(deliverable?.status ?? 'NOT_STARTED')
  const [links, setLinks] = useState<LinkDraft[]>(
    deliverable?.links.map((l) => ({ label: l.label, url: l.url })) ?? [],
  )
  const [error, setError] = useState<string | null>(null)
  const [add, adding] = useMutation(ADD_PROJECT_DELIVERABLE, { refetchQueries: [PROJECT] })
  const [update, updating] = useMutation(UPDATE_PROJECT_DELIVERABLE, { refetchQueries: [PROJECT] })
  const busy = adding.loading || updating.loading

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const cleanLinks = links.filter((l) => l.label.trim() && l.url.trim())
    try {
      if (deliverable) {
        await update({
          variables: {
            input: {
              id: deliverable.id,
              title,
              ownerId: ownerId || null,
              reviewerId: reviewerId || null,
              dueDate: dueDate || null,
              status: status as DeliverableStatus,
              links: cleanLinks,
            },
          },
        })
        toast.success(`${title} saved`)
      } else {
        await add({
          variables: {
            input: {
              projectId: project.id,
              phaseId,
              title,
              kind: kind as DeliverableKind,
              ownerId: ownerId || null,
              reviewerId: reviewerId || null,
              dueDate: dueDate || null,
            },
          },
        })
        toast.success(`${title} added`)
      }
      onOpenChange(false)
    } catch (err) {
      setError(message(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{deliverable ? 'Edit deliverable' : 'Add deliverable'}</DialogTitle>
            <DialogDescription>
              Track readiness and review here. Link documents stored elsewhere; never enter
              patient-level records.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="deliverable-title">Title</Label>
            <Input
              id="deliverable-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={160}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {deliverable ? null : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="deliverable-kind">Kind</Label>
                <NativeSelect
                  id="deliverable-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="OUTPUT">Phase output</option>
                  <option value="DATA_CATEGORY">Master-data category</option>
                </NativeSelect>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="deliverable-owner">Owner</Label>
              <PersonSelect
                id="deliverable-owner"
                people={members}
                value={ownerId}
                onChange={setOwnerId}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="deliverable-reviewer">Reviewer</Label>
              <PersonSelect
                id="deliverable-reviewer"
                people={members}
                value={reviewerId}
                onChange={setReviewerId}
                emptyLabel="No reviewer"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="deliverable-due">Review due</Label>
              <Input
                id="deliverable-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            {deliverable ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="deliverable-status">Status</Label>
                <NativeSelect
                  id="deliverable-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {DELIVERABLE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
          </div>
          {deliverable ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Links</legend>
              {links.map((l, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    aria-label={`Link ${i + 1} label`}
                    placeholder="Label"
                    value={l.label}
                    maxLength={120}
                    onChange={(e) =>
                      setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                    }
                  />
                  <Input
                    aria-label={`Link ${i + 1} URL`}
                    placeholder="https://…"
                    type="url"
                    value={l.url}
                    onChange={(e) =>
                      setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLinks(links.filter((_, j) => j !== i))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {links.length < 20 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setLinks([...links, { label: '', url: '' }])}
                >
                  Add link
                </Button>
              ) : null}
            </fieldset>
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
              {busy ? 'Saving…' : deliverable ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
