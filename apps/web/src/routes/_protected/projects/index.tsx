import { createFileRoute } from '@tanstack/react-router'
import { ProjectsPage } from '@/feature/projects'

export const Route = createFileRoute('/_protected/projects/')({ component: ProjectsPage })
