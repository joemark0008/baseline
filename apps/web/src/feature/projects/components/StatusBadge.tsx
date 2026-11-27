import { Badge } from '@/components/ui/badge'
import { label } from '../lib'

const DESTRUCTIVE = new Set(['AT_RISK', 'BLOCKED', 'CHANGES_REQUESTED', 'OVERDUE'])
const EMPHASIS = new Set(['IN_PROGRESS', 'IN_REVIEW', 'MANAGER', 'HIGH'])
const DONE = new Set(['COMPLETE', 'READY', 'APPROVED'])

/** One look for every status, priority, kind and role value. */
export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return null
  if (DESTRUCTIVE.has(value)) {
    return (
      <Badge className="border-destructive/20 bg-destructive/10 text-destructive">
        {label(value)}
      </Badge>
    )
  }
  if (DONE.has(value)) return <Badge variant="secondary">{label(value)}</Badge>
  if (EMPHASIS.has(value)) return <Badge>{label(value)}</Badge>
  return <Badge variant="outline">{label(value)}</Badge>
}

export function OverdueBadge() {
  return <Badge className="border-destructive/20 bg-destructive/10 text-destructive">Overdue</Badge>
}
