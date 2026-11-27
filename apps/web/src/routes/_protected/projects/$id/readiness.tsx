import { createFileRoute } from '@tanstack/react-router'
import { ProjectReadinessTab } from '@/feature/projects/project/readiness'

export const Route = createFileRoute('/_protected/projects/$id/readiness')({
  component: ProjectReadinessTab,
})
