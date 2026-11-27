import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { parseWorkSearch, type WorkSearch } from '../lib'

const projectRoute = getRouteApi('/_protected/projects/$id')

/** Declared on the `/projects/$id` route so every work view shares the same filters. */
export const validateWorkSearch = (search: Record<string, unknown>): WorkSearch =>
  parseWorkSearch(search)

/** The shared filters of the current project, and a way to patch them in place. */
export function useWorkSearch() {
  const search = projectRoute.useSearch()
  const navigate = useNavigate()
  const setSearch = (patch: Partial<WorkSearch>) =>
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => parseWorkSearch({ ...prev, ...patch }),
      replace: true,
    })
  return { search, setSearch }
}
