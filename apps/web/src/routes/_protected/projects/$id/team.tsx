import { createFileRoute } from '@tanstack/react-router'
import { ProjectTeamTab } from '@/feature/projects/project/team'

export const Route = createFileRoute('/_protected/projects/$id/team')({ component: ProjectTeamTab })
