import { createFileRoute } from '@tanstack/react-router'
import { ProjectTasksTab } from '@/feature/projects/project/tasks'

export const Route = createFileRoute('/_protected/projects/$id/tasks')({
  validateSearch: (search: Record<string, unknown>) => ({
    task: typeof search.task === 'string' ? search.task : undefined,
  }),
  component: ProjectTasksTab,
})
