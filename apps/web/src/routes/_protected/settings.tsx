import { createFileRoute } from '@tanstack/react-router'
import { SettingsLayout } from '@/feature/settings/layout'

export const Route = createFileRoute('/_protected/settings')({ component: SettingsLayout })
