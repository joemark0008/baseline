import { createFileRoute } from '@tanstack/react-router'
import { ProjectLayout } from '@/feature/projects/project/layout'

export const Route = createFileRoute('/_protected/projects/$id')({
  component: function ProjectRoute() {
    const { id } = Route.useParams()
    return <ProjectLayout id={id} />
  },
})
