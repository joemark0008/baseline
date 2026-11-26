import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '@/feature/settings/roles'

export const Route = createFileRoute('/_protected/settings/roles/')({ component: RolesPage })
