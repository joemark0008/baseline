import { Button } from '@/components/ui/button'
import type { Folding } from '../readability'

export interface FoldAllProps {
  folding: Folding
  phaseIds: ReadonlyArray<string>
}

/** Feature 011 FR-014: fold or open every phase at once. */
export function FoldAll({ folding, phaseIds }: FoldAllProps) {
  const allFolded = phaseIds.length > 0 && phaseIds.every((id) => folding.isCollapsed(id))
  const noneFolded = phaseIds.every((id) => !folding.isCollapsed(id))
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={allFolded}
        onClick={() => folding.collapseAll(phaseIds)}
      >
        Collapse all
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={noneFolded}
        onClick={() => folding.expandAll()}
      >
        Expand all
      </Button>
    </div>
  )
}
