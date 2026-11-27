import { createFileRoute } from '@tanstack/react-router'
import { ProjectLayout } from '@/feature/projects/project/layout'
import { validateWorkSearch } from '@/feature/projects/project/work-search'

export const Route = createFileRoute('/_protected/projects/$id')({
  validateSearch: validateWorkSearch,
  component: function ProjectRoute() {
    const { id } = Route.useParams()
    return <ProjectLayout id={id} />
  },
})
