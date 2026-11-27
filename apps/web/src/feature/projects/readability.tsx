import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { readViewPreference, writeViewPreference, type BoardLayout } from './view-preferences'

export interface Readability {
  showDone: boolean
  setShowDone: (value: boolean) => void
  layout: BoardLayout
  setLayout: (value: BoardLayout) => void
  isCollapsed: (phaseId: string) => boolean
  toggle: (phaseId: string) => void
  collapseAll: (phaseIds: ReadonlyArray<string>) => void
  expandAll: () => void
}

/** The folding operations a list of phases needs (ISP: views that do not fold take nothing). */
export type Folding = Pick<Readability, 'isCollapsed' | 'toggle' | 'collapseAll' | 'expandAll'>

const noop = () => {}
/** Without a provider (unit tests of a lone view) the settings are inert defaults. */
const INERT: Readability = {
  showDone: false,
  setShowDone: noop,
  layout: 'columns',
  setLayout: noop,
  isCollapsed: () => false,
  toggle: noop,
  collapseAll: noop,
  expandAll: noop,
}

const ReadabilityContext = createContext<Readability>(INERT)

export interface ReadabilityProviderProps {
  projectId: string
  phaseIds: ReadonlyArray<string>
  children: ReactNode
}

/**
 * Feature 011 (research.md › Decisions 2, 5): hide-done, folded phases and the Board layout for
 * one project on this device. Mount it with `key={projectId}` so each project starts from its
 * own stored values.
 */
export function ReadabilityProvider({ projectId, phaseIds, children }: ReadabilityProviderProps) {
  const [state, setState] = useState(() => {
    const stored = readViewPreference(projectId, phaseIds)
    return { showDone: stored.showDone, collapsed: stored.collapsed, layout: stored.boardLayout }
  })

  const persist = useCallback(
    (next: { showDone: boolean; collapsed: string[]; layout: BoardLayout }) => {
      writeViewPreference(projectId, {
        showDone: next.showDone,
        collapsed: next.collapsed,
        boardLayout: next.layout,
      })
      return next
    },
    [projectId],
  )
  const update = useCallback(
    (fn: (prev: typeof state) => typeof state) => setState((prev) => persist(fn(prev))),
    [persist],
  )

  const value = useMemo<Readability>(() => {
    const collapsed = new Set(state.collapsed)
    return {
      showDone: state.showDone,
      setShowDone: (showDone) => update((prev) => ({ ...prev, showDone })),
      layout: state.layout,
      setLayout: (layout) => update((prev) => ({ ...prev, layout })),
      isCollapsed: (id) => collapsed.has(id),
      toggle: (id) =>
        update((prev) => ({
          ...prev,
          collapsed: prev.collapsed.includes(id)
            ? prev.collapsed.filter((x) => x !== id)
            : [...prev.collapsed, id],
        })),
      collapseAll: (ids) => update((prev) => ({ ...prev, collapsed: [...ids] })),
      expandAll: () => update((prev) => ({ ...prev, collapsed: [] })),
    }
  }, [state, update])

  return <ReadabilityContext.Provider value={value}>{children}</ReadabilityContext.Provider>
}

export const useReadability = (): Readability => useContext(ReadabilityContext)
