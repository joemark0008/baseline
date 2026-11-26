import { createFileRoute } from '@tanstack/react-router'
import { ProjectPreviewPage } from '@/feature/implementation-preview'

export const Route = createFileRoute('/preview')({ component: ProjectPreviewPage })
