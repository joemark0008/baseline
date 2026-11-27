import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { PhaseData } from '../lib'

export interface LaneCounts {
  open: number
  overdue: number
  done: number
  matching: number
  total: number
}

export interface BoardLaneProps {
  phase: PhaseData
  collapsed: boolean
  counts: LaneCounts
  filtered?: boolean
  onToggle?: (phaseId: string) => void
  children: ReactNode
}

/** Feature 011 US4: one phase's row of status cells, foldable to its header and compact cells. */
export function BoardLane({
  phase,
  collapsed,
  counts,
  filtered = false,
  onToggle,
  children,
}: BoardLaneProps) {
  return (
    <section aria-label={`${phase.name} lane`} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {onToggle ? (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${phase.name}`}
            className="flex rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => onToggle(phase.id)}
          >
            <ChevronRight
              aria-hidden="true"
              className={`size-4 motion-safe:transition-transform ${collapsed ? '' : 'rotate-90'}`}
            />
          </button>
        ) : null}
        <h3 className="font-semibold">{phase.name}</h3>
        <Badge variant="secondary" aria-label={`${counts.open} open in ${phase.name}`}>
          {filtered ? `${counts.matching} of ${counts.total}` : counts.open}
        </Badge>
        {counts.overdue > 0 ? (
          <span className="text-xs font-medium text-destructive">{counts.overdue} overdue</span>
        ) : null}
        <span className="text-xs text-muted-foreground">{counts.done} done</span>
      </div>
      <div
        className={`-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 ${collapsed ? '' : 'pb-2'}`}
      >
        {children}
      </div>
    </section>
  )
}
