import { createFileRoute } from '@tanstack/react-router'
import { ProjectOverviewTab } from '@/feature/projects/project/overview'

export const Route = createFileRoute('/_protected/projects/$id/')({ component: ProjectOverviewTab })
