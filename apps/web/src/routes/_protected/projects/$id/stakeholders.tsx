import { createFileRoute } from '@tanstack/react-router'
import { ProjectStakeholdersTab } from '@/feature/projects/project/stakeholders'

export const Route = createFileRoute('/_protected/projects/$id/stakeholders')({
  component: ProjectStakeholdersTab,
})
