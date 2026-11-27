import { createFileRoute } from '@tanstack/react-router'
import { ProjectTimelineTab } from '@/feature/projects/project/timeline'

export const Route = createFileRoute('/_protected/projects/$id/timeline')({
  component: ProjectTimelineTab,
})
