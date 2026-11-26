import { createFileRoute } from '@tanstack/react-router'
import { AccessHistoryPage } from '@/feature/settings/roles/history'

export const Route = createFileRoute('/_protected/settings/roles/history')({
  component: AccessHistoryPage,
})
