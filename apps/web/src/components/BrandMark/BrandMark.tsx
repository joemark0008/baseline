import { cn } from '@/lib/utils'

/** The product name; `scripts/init.sh` replaces the placeholder. */
export const PRODUCT_NAME = 'his-project-planner'

/** The wordmark. Swapping in a logo file is a change to this one component. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold tracking-tight', className)} data-testid="brand-mark">
      {PRODUCT_NAME}
    </span>
  )
}
