import { Button } from '@/components/ui/button'
import type { EmptyReason } from '../lib'

export interface EmptyWorkProps {
  reason: EmptyReason
  /** Completed tasks the view is leaving out (the matching ones, for `only-done-match`). */
  hiddenDone: number
  onShowDone?: () => void
  onClear?: () => void
}

const MESSAGE: Record<Exclude<EmptyReason, 'only-done-match'>, string> = {
  none: 'No tasks yet.',
  'all-done': 'All work in this view is done.',
  'no-match': 'No tasks match.',
}

/** Feature 011 FR-009: why a work view is empty, with the one action that fixes it. */
export function EmptyWork({ reason, hiddenDone, onShowDone, onClear }: EmptyWorkProps) {
  const text =
    reason === 'only-done-match'
      ? `${hiddenDone} completed ${hiddenDone === 1 ? 'task matches' : 'tasks match'}.`
      : MESSAGE[reason]
  const showDone = (reason === 'all-done' || reason === 'only-done-match') && onShowDone
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center"
    >
      <p className="text-sm text-muted-foreground">{text}</p>
      {showDone ? (
        <Button size="sm" variant="outline" onClick={onShowDone}>
          Show done
        </Button>
      ) : null}
      {reason === 'no-match' && onClear ? (
        <Button size="sm" variant="outline" onClick={onClear}>
          Clear search and filters
        </Button>
      ) : null}
    </div>
  )
}
