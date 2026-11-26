import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '@/feature/admin/users'

export const Route = createFileRoute('/_protected/admin/users')({ component: UsersPage })
