import { createFileRoute } from '@tanstack/react-router'
import { ProjectListView } from '@/feature/projects/project/list'

export const Route = createFileRoute('/_protected/projects/$id/list')({
  component: ProjectListView,
})
