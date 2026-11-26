import { createFileRoute } from '@tanstack/react-router'
import { ProjectPreviewPage } from '@/feature/projects/preview'

export const Route = createFileRoute('/preview')({ component: ProjectPreviewPage })
