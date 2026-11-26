import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/feature/dashboard'

export const Route = createFileRoute('/_protected/dashboard')({ component: DashboardPage })
