import { createFileRoute } from '@tanstack/react-router'
import { AuthCallbackPage } from '@/feature/auth/callback'

export const Route = createFileRoute('/_public/auth/callback')({ component: AuthCallbackPage })
