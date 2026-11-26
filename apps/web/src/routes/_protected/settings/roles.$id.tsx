import { createFileRoute } from '@tanstack/react-router'
import { RoleEditorPage } from '@/feature/settings/roles/editor'

export const Route = createFileRoute('/_protected/settings/roles/$id')({
  component: function RoleRoute() {
    const { id } = Route.useParams()
    return <RoleEditorPage id={id} />
  },
})
