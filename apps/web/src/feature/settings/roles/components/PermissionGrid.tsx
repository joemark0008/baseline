import { Fragment } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type GridAction = 'VIEW' | 'ADD' | 'EDIT' | 'DELETE'

export interface GridArea {
  key: string
  name: string
  /** Only the actions this area offers; `requires` comes from the server's catalogue. */
  actions: ReadonlyArray<{
    action: GridAction
    description: string
    requires: readonly GridAction[]
  }>
}

const COLUMNS: GridAction[] = ['VIEW', 'ADD', 'EDIT', 'DELETE']
const LABEL: Record<GridAction, string> = {
  VIEW: 'View',
  ADD: 'Add',
  EDIT: 'Edit',
  DELETE: 'Delete',
}

const key = (area: string, action: GridAction) => `${area}:${action.toLowerCase()}`

/**
 * Features × View/Add/Edit/Delete. Value is `"area:action"` strings. Ticking an action also
 * ticks what the server says it requires; unticking one clears the actions that require it.
 * The server normalizes again on save, so this is only immediate feedback.
 */
export function PermissionGrid({
  areas,
  value,
  onChange,
  readOnly = false,
}: {
  areas: readonly GridArea[]
  value: readonly string[]
  onChange: (next: string[]) => void
  readOnly?: boolean
}) {
  const ticked = new Set(value)

  function toggle(area: GridArea, action: GridAction, on: boolean) {
    const next = new Set(ticked)
    const requires = (a: GridAction) => area.actions.find((x) => x.action === a)?.requires ?? []
    if (on) {
      next.add(key(area.key, action))
      for (const r of requires(action)) next.add(key(area.key, r))
    } else {
      next.delete(key(area.key, action))
      for (const a of area.actions) {
        if (a.requires.includes(action)) next.delete(key(area.key, a.action))
      }
    }
    // Keep catalogue order so the saved value is stable.
    onChange(areas.flatMap((a) => COLUMNS.map((c) => key(a.key, c))).filter((k) => next.has(k)))
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Feature</TableHead>
          {COLUMNS.map((c) => (
            <TableHead key={c} className="w-20 text-center">
              {LABEL[c]}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {areas.map((area) => (
          <TableRow key={area.key}>
            <TableCell className="font-medium">{area.name}</TableCell>
            {COLUMNS.map((c) => {
              const offered = area.actions.find((a) => a.action === c)
              return (
                <Fragment key={c}>
                  <TableCell className="text-center">
                    {offered ? (
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        aria-label={`${area.name}: ${LABEL[c]}`}
                        title={offered.description}
                        checked={ticked.has(key(area.key, c))}
                        disabled={readOnly}
                        onChange={(e) => toggle(area, c, e.target.checked)}
                      />
                    ) : (
                      <span
                        className="text-muted-foreground/50"
                        aria-label={`${area.name}: ${LABEL[c]} (not used)`}
                      >
                        —
                      </span>
                    )}
                  </TableCell>
                </Fragment>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
