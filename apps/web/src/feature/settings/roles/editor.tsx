import { useMutation, useQuery } from '@apollo/client/react'
import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PermissionAction } from '@/graphql/codegen/graphql'
import { can } from '@/lib/access'
import { PermissionGrid, type GridArea } from './components/PermissionGrid'
import {
  CREATE_ROLE,
  DELETE_ROLE,
  PERMISSION_AREAS,
  ROLE_EDITOR,
  ROLES,
  UPDATE_ROLE,
} from './operations'

type Grant = { area: string; action: string }
const toKeys = (grants: readonly Grant[]) =>
  grants.map((g) => `${g.area}:${g.action.toLowerCase()}`)
const toGrants = (keys: readonly string[]) =>
  keys.map((k) => {
    const [area, action] = k.split(':')
    return { area, action: action.toUpperCase() as PermissionAction }
  })
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

/** Create a role (no id) or change one. */
export function RoleEditorPage({ id }: { id?: string }) {
  const editing = useQuery(ROLE_EDITOR, { variables: { id: id ?? '' }, skip: !id })
  const creating = useQuery(PERMISSION_AREAS, { skip: Boolean(id) })
  const role = editing.data?.role
  const areas: readonly GridArea[] =
    editing.data?.permissionAreas ?? creating.data?.permissionAreas ?? []
  if (id && !role) {
    return <p className="text-sm text-muted-foreground">{editing.error?.message ?? 'Loading…'}</p>
  }
  // Remount when the role loads so the form starts from its values.
  return <RoleForm key={role?.id ?? 'new'} role={role ?? null} areas={areas} />
}

function RoleForm({
  role,
  areas,
}: {
  role: {
    id: string
    name: string
    description?: string | null
    kind: string
    grants: readonly Grant[]
    memberCount: number
    pendingInviteCount: number
    can: { edit: boolean; rename: boolean; editGrants: boolean; delete: boolean }
  } | null
  areas: readonly GridArea[]
}) {
  const { access } = useRouteContext({ from: '/_protected' })
  const navigate = useNavigate()
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [keys, setKeys] = useState<string[]>(role ? toKeys(role.grants) : [])
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [createRole, created] = useMutation(CREATE_ROLE, { refetchQueries: [ROLES] })
  const [updateRole, updated] = useMutation(UPDATE_ROLE, { refetchQueries: [ROLES] })
  const [deleteRole, deleted] = useMutation(DELETE_ROLE, { refetchQueries: [ROLES] })

  // The server decides what this caller may change; a new role is fully editable with roles:add.
  const creating = can(access, 'roles', 'add')
  const caps = role?.can ?? {
    edit: creating,
    rename: creating,
    editGrants: creating,
    delete: false,
  }
  const isAdmin = role?.kind === 'ADMIN'
  const busy = created.loading || updated.loading || deleted.loading

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (role) {
        await updateRole({
          variables: {
            input: {
              id: role.id,
              name: caps.rename ? name : undefined,
              description: description || null,
              grants: caps.editGrants ? toGrants(keys) : undefined,
            },
          },
        })
      } else {
        await createRole({
          variables: { input: { name, description: description || null, grants: toGrants(keys) } },
        })
      }
      toast.success(role ? `${name} saved` : `${name} created`)
      await navigate({ to: '/settings/roles' })
    } catch (err) {
      setError(message(err))
    }
  }

  /** Resolves to an error message for the confirmation dialog, or null once deleted. */
  async function remove(): Promise<string | null> {
    if (!role) return null
    try {
      await deleteRole({ variables: { id: role.id } })
    } catch (err) {
      return message(err)
    }
    toast.success(`${role.name} deleted`)
    await navigate({ to: '/settings/roles' })
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{role ? role.name : 'New role'}</CardTitle>
        <CardDescription>
          {isAdmin
            ? 'Admin can do everything, including features added later. Its grid cannot be changed.'
            : 'Tick what people in this role may do. Add, Edit and Delete include View.'}
          {role ? ` ${role.memberCount} people, ${role.pendingInviteCount} pending invites.` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={50}
                required
                disabled={!caps.rename}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                disabled={!caps.edit}
              />
            </div>
          </div>
          <PermissionGrid
            areas={areas}
            value={keys}
            onChange={setKeys}
            readOnly={!caps.editGrants}
          />
          <div className="flex gap-2">
            {caps.edit ? (
              <Button type="submit" disabled={busy}>
                {role ? 'Save' : 'Create role'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/settings/roles' })}
            >
              Back
            </Button>
            {caps.delete ? (
              <Button
                type="button"
                variant="destructive"
                className="ml-auto"
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete role
              </Button>
            ) : null}
          </div>
        </form>
        {role ? (
          <ConfirmDialog
            open={confirmingDelete}
            onOpenChange={setConfirmingDelete}
            title={`Delete ${role.name}?`}
            description="This can't be undone. A role that people or pending invites still use can't be deleted."
            confirmLabel="Delete role"
            onConfirm={remove}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
