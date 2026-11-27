import { createFileRoute } from '@tanstack/react-router'
import { TemplatePage } from '@/feature/settings/template'

export const Route = createFileRoute('/_protected/settings/template')({ component: TemplatePage })
