import { createFileRoute, redirect } from '@tanstack/react-router'

/** The flat tasks table became the List (feature 010); old links and emails still land here. */
export const Route = createFileRoute('/_protected/projects/$id/tasks')({
  beforeLoad: ({ params, search }) => {
    throw redirect({ to: '/projects/$id/list', params, search, replace: true })
  },
})
