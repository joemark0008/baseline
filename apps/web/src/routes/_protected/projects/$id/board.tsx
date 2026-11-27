import { createFileRoute } from '@tanstack/react-router'
import { ProjectBoardView } from '@/feature/projects/project/board'

export const Route = createFileRoute('/_protected/projects/$id/board')({
  component: ProjectBoardView,
})
