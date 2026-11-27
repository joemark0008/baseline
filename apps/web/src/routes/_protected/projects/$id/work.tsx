import { createFileRoute, redirect } from '@tanstack/react-router'
import { readViewPreference } from '@/feature/projects/view-preferences'

const TARGET = {
  board: '/projects/$id/board',
  list: '/projects/$id/list',
  timeline: '/projects/$id/timeline',
} as const

/** FR-015: lands on the work view this person used last for this project, with its filters. */
export const Route = createFileRoute('/_protected/projects/$id/work')({
  beforeLoad: ({ params }) => {
    const preference = readViewPreference(params.id)
    throw redirect({
      to: TARGET[preference.view],
      params,
      search: preference.search,
      replace: true,
    })
  },
})
