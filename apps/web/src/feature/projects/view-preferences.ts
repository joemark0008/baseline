import { parseWorkSearch, type WorkSearch } from './lib'

export type WorkView = 'board' | 'list' | 'timeline'
export type BoardLayout = 'columns' | 'lanes'
export interface ViewPreference {
  view: WorkView
  search: WorkSearch
  /** Feature 011 FR-003: completed tasks shown. */
  showDone: boolean
  /** Feature 011 FR-013: folded phase ids. */
  collapsed: string[]
  /** Feature 011 FR-016. */
  boardLayout: BoardLayout
}

const KEY = (projectId: string) => `baseline.project-view.${projectId}`
const DEFAULT: ViewPreference = {
  view: 'board',
  search: {},
  showDone: false,
  collapsed: [],
  boardLayout: 'columns',
}
const isView = (v: unknown): v is WorkView => v === 'board' || v === 'list' || v === 'timeline'
const isLayout = (v: unknown): v is BoardLayout => v === 'columns' || v === 'lanes'

/**
 * FR-015 (010) and FR-003/FR-013/FR-016 (011): the last work view, filters and readability
 * settings per project, kept on this device only. Storage can be missing, blocked or corrupt;
 * every path falls back to the defaults. `phaseIds`, when given, drops folded phases that no
 * longer exist.
 */
export function readViewPreference(
  projectId: string,
  phaseIds?: ReadonlyArray<string>,
): ViewPreference {
  try {
    const raw = localStorage.getItem(KEY(projectId))
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const search = parseWorkSearch(
      parsed.search && typeof parsed.search === 'object'
        ? (parsed.search as Record<string, unknown>)
        : {},
    )
    // A task opened in the side panel is not a preference.
    delete search.task
    const known = phaseIds ? new Set(phaseIds) : null
    const collapsed = Array.isArray(parsed.collapsed)
      ? parsed.collapsed.filter(
          (id): id is string => typeof id === 'string' && (!known || known.has(id)),
        )
      : []
    return {
      view: isView(parsed.view) ? parsed.view : 'board',
      search,
      showDone: parsed.showDone === true,
      collapsed,
      boardLayout: isLayout(parsed.boardLayout) ? parsed.boardLayout : 'columns',
    }
  } catch {
    return { ...DEFAULT }
  }
}

/** Merges `patch` into the stored preference so the view/filters and readability writers coexist. */
export function writeViewPreference(projectId: string, patch: Partial<ViewPreference>): void {
  try {
    const next = { ...readViewPreference(projectId), ...patch }
    const search = { ...next.search }
    delete search.task
    localStorage.setItem(KEY(projectId), JSON.stringify({ ...next, search }))
  } catch {
    // Private mode or blocked storage: the preference is a convenience, not state.
  }
}
