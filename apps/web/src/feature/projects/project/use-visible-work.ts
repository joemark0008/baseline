import { useMemo } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  CLEARED_FILTERS,
  emptyReason,
  hasWorkFilters,
  hiddenDoneCount,
  visibleTasks,
  type ProjectData,
  type TaskData,
  type VisibleContext,
} from '../lib'
import { useReadability } from '../readability'
import { useWorkSearch } from './work-search'

/**
 * Feature 011: one place where a work view turns the project's tasks into what it draws, with
 * the figures the filter bar and the empty state need (research.md › Decision 4).
 */
export function useVisibleWork<T extends TaskData>(
  tasks: T[],
  project: ProjectData,
  options: { recentDoneVisible?: boolean } = {},
) {
  const { search, setSearch } = useWorkSearch()
  const { current } = useCurrentUser()
  const { showDone, setShowDone } = useReadability()
  const userId = current?.user.id ?? null
  const recentDoneVisible = options.recentDoneVisible ?? false
  const ctx = useMemo<VisibleContext>(
    () => ({ search, phases: project.phases, userId, showDone, recentDoneVisible }),
    [search, project.phases, userId, showDone, recentDoneVisible],
  )
  const visible = useMemo(() => visibleTasks(tasks, ctx), [tasks, ctx])
  const hiddenDone = hiddenDoneCount(tasks, visible)
  const reason = emptyReason(tasks, visible, ctx)
  const hiddenMatches =
    reason === 'only-done-match'
      ? visibleTasks(tasks, { ...ctx, showDone: true }).length
      : hiddenDone
  return {
    search,
    setSearch,
    visible,
    filtered: hasWorkFilters(search),
    hiddenDone,
    hiddenMatches,
    reason,
    showDone,
    showAllDone: () => setShowDone(true),
    clearFilters: () => setSearch(CLEARED_FILTERS),
  }
}
