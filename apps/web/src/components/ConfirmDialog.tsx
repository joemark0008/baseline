import { useState, type MouseEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Names the action and its target, e.g. "Deactivate Bo?". */
  title: string
  /** Says what will happen. */
  description: string
  /** Text of the destructive confirm button. */
  confirmLabel: string
  /** Runs the action; resolves to an error message, or null on success. */
  onConfirm: () => Promise<string | null>
}

/** Asks before a destructive action; keeps the dialog open and shows the error if it fails. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function change(next: boolean) {
    if (busy) return
    setError(null) // a reopened dialog starts clean, however the caller reopens it
    onOpenChange(next)
  }

  async function confirm(e: MouseEvent) {
    e.preventDefault() // close only once the action has succeeded
    setBusy(true)
    setError(null)
    const failed = await onConfirm()
    setBusy(false)
    if (failed) setError(failed)
    else onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={change}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={busy} onClick={confirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
