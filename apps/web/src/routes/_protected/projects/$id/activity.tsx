import { createFileRoute } from '@tanstack/react-router'
import { ProjectActivityTab } from '@/feature/projects/project/activity'

export const Route = createFileRoute('/_protected/projects/$id/activity')({
  component: ProjectActivityTab,
})
