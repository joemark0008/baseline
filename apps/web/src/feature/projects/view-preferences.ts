import { parseWorkSearch, type WorkSearch } from './lib'

export type WorkView = 'board' | 'list' | 'timeline'
export interface ViewPreference {
  view: WorkView
  search: WorkSearch
}

const KEY = (projectId: string) => `baseline.project-view.${projectId}`
const DEFAULT: ViewPreference = { view: 'board', search: {} }
const isView = (v: unknown): v is WorkView => v === 'board' || v === 'list' || v === 'timeline'

/**
 * FR-015: the last work view and filters per project, kept on this device only. Storage can be
 * missing, blocked or corrupt; every path falls back to the Board with no filters.
 */
export function readViewPreference(projectId: string): ViewPreference {
  try {
    const raw = localStorage.getItem(KEY(projectId))
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as { view?: unknown; search?: unknown }
    const search = parseWorkSearch(
      parsed.search && typeof parsed.search === 'object'
        ? (parsed.search as Record<string, unknown>)
        : {},
    )
    // A task opened in the side panel is not a preference.
    delete search.task
    return { view: isView(parsed.view) ? parsed.view : 'board', search }
  } catch {
    return DEFAULT
  }
}

export function writeViewPreference(projectId: string, preference: ViewPreference): void {
  try {
    const search = { ...preference.search }
    delete search.task
    localStorage.setItem(KEY(projectId), JSON.stringify({ view: preference.view, search }))
  } catch {
    // Private mode or blocked storage: the preference is a convenience, not state.
  }
}
