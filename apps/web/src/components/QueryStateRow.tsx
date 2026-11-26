import { TableCell, TableRow } from '@/components/ui/table'

export interface QueryStateRowProps {
  /** Number of columns in the table, so the message spans the full width. */
  colSpan: number
  /** A query is running and no data has arrived yet. */
  loading: boolean
  /** Error message to show; it beats `loading` and `isEmpty`. */
  error: string | null
  /** The data arrived and has no rows. */
  isEmpty: boolean
  /** Text for the empty state. */
  emptyMessage: string
}

/** One table row for a list query's non-data states: error, then loading, then empty. */
export function QueryStateRow({
  colSpan,
  loading,
  error,
  isEmpty,
  emptyMessage,
}: QueryStateRowProps) {
  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} role="alert" className="text-destructive">
          {error}
        </TableCell>
      </TableRow>
    )
  }
  const message = loading ? 'Loading…' : isEmpty ? emptyMessage : null
  if (!message) return null
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  )
}
