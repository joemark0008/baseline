import { useMutation, useQuery } from '@apollo/client/react'
import { useRouteContext } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageHeader } from '@/components/PageHeader'
import { QueryStateRow } from '@/components/QueryStateRow'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { can } from '@/lib/access'
import { InviteForm } from './components/InviteForm'
import { ResetLinkDialog, type ResetLink } from './components/ResetLinkDialog'
import { UserRow } from './components/UserRow'
import {
  ASSIGNABLE_ROLES,
  CANCEL_PASSWORD_RESET_LINK,
  CREATE_PASSWORD_RESET_LINK,
  DEACTIVATE_USER,
  FIND_ALL_USERS,
  INVITE_ROLES,
  INVITE_USER,
  PENDING_INVITES,
  REACTIVATE_USER,
  REVOKE_INVITE,
  SET_USER_ROLE,
  UPDATE_USER,
} from './operations'

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export function UsersPage() {
  const { access } = useRouteContext({ from: '/_protected' })
  const { current } = useCurrentUser()
  const [error, setError] = useState<string | null>(null)
  const [resetLink, setResetLink] = useState<ResetLink | null>(null)
  const [revoking, setRevoking] = useState<{ id: string; email: string } | null>(null)

  const mayInvite = can(access, 'invites', 'add')
  const mayListInvites = can(access, 'invites', 'view')
  const mayRevoke = can(access, 'invites', 'delete')
  const mayMove = can(access, 'roles', 'edit')

  const users = useQuery(FIND_ALL_USERS, { variables: { page: 1, perPage: 200 } })
  const inviteRoles = useQuery(INVITE_ROLES, { skip: !mayInvite })
  const roles = useQuery(ASSIGNABLE_ROLES, { skip: !mayMove })
  const pending = useQuery(PENDING_INVITES, {
    variables: { page: 1, perPage: 100 },
    skip: !mayListInvites,
  })
  const refetch = { refetchQueries: [FIND_ALL_USERS, ASSIGNABLE_ROLES] }
  const [inviteUser] = useMutation(INVITE_USER, { refetchQueries: [PENDING_INVITES] })
  const [revokeInvite] = useMutation(REVOKE_INVITE, { refetchQueries: [PENDING_INVITES] })
  const [setUserRole] = useMutation(SET_USER_ROLE, refetch)
  const [updateUser] = useMutation(UPDATE_USER, refetch)
  const [deactivateUser] = useMutation(DEACTIVATE_USER, refetch)
  const [reactivateUser] = useMutation(REACTIVATE_USER, refetch)
  const [createResetLink] = useMutation(CREATE_PASSWORD_RESET_LINK, refetch)
  const [cancelResetLink] = useMutation(CANCEL_PASSWORD_RESET_LINK, refetch)

  /** Runs a mutation; toasts `success` on success, otherwise returns the error message. */
  async function run(action: () => Promise<unknown>, success?: string): Promise<string | null> {
    try {
      await action()
      if (success) toast.success(success)
      return null
    } catch (e) {
      return message(e)
    }
  }

  /** Like `run`, but shows a failure at the top of the page (for actions without a dialog). */
  async function attempt(action: () => Promise<unknown>, success?: string): Promise<boolean> {
    setError(null)
    const failed = await run(action, success)
    setError(failed)
    return failed === null
  }

  const invites = pending.data?.pendingInvites

  return (
    <>
      <PageHeader
        title="Users"
        description="People who can sign in, their roles, and invitations."
      />
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {resetLink ? <ResetLinkDialog link={resetLink} onClose={() => setResetLink(null)} /> : null}
      {mayInvite ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite someone</CardTitle>
            <CardDescription>
              Sign-up is by invitation only. The link expires in 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inviteRoles.data ? (
              <InviteForm
                roles={inviteRoles.data.inviteRoles}
                onInvite={async (email, roleId) => {
                  try {
                    const { data } = await inviteUser({
                      variables: { input: { email, roleId } },
                    })
                    if (!data) return { error: 'No response' }
                    toast.success(`Invite created for ${email}`)
                    return { inviteUrl: data.inviteUser.inviteUrl }
                  } catch (e) {
                    return { error: message(e) }
                  }
                }}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      {mayListInvites ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites {invites ? `(${invites.meta.total})` : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <QueryStateRow
                  colSpan={4}
                  loading={pending.loading && !pending.data}
                  error={pending.error?.message ?? null}
                  isEmpty={invites?.data.length === 0}
                  emptyMessage="No pending invites."
                />
                {(pending.error ? [] : (invites?.data ?? [])).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.email}</TableCell>
                    <TableCell className="text-muted-foreground">{i.accessRole.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(i.expiresAt as string).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {mayRevoke ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRevoking({ id: i.id, email: i.email })}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => (open ? null : setRevoking(null))}
        title={`Revoke the invite for ${revoking?.email ?? ''}?`}
        description="The invitation link stops working. You can invite them again later."
        confirmLabel="Revoke invite"
        onConfirm={() =>
          run(
            () => revokeInvite({ variables: { id: revoking?.id ?? '' } }),
            `Invite for ${revoking?.email ?? ''} revoked`,
          )
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>
            All users {users.data ? `(${users.data.findAllUsers.meta.total})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <QueryStateRow
                colSpan={6}
                loading={users.loading && !users.data}
                error={users.error?.message ?? null}
                isEmpty={users.data?.findAllUsers.data.length === 0}
                emptyMessage="No people yet."
              />
              {users.error
                ? null
                : users.data?.findAllUsers.data.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      isSelf={u.id === current?.user.id}
                      roleOptions={roles.data?.assignableRoles ?? []}
                      onSetRole={(roleId) =>
                        attempt(
                          () => setUserRole({ variables: { input: { userId: u.id, roleId } } }),
                          `${u.name}'s role changed`,
                        )
                      }
                      onUpdate={(changes) =>
                        attempt(
                          () => updateUser({ variables: { input: { id: u.id, ...changes } } }),
                          `${changes.name} updated`,
                        )
                      }
                      onDeactivate={() =>
                        run(
                          () => deactivateUser({ variables: { id: u.id } }),
                          `${u.name} was deactivated`,
                        )
                      }
                      onReactivate={() =>
                        attempt(
                          () => reactivateUser({ variables: { id: u.id } }),
                          `${u.name} was reactivated`,
                        )
                      }
                      onResetPassword={() =>
                        attempt(async () => {
                          const { data } = await createResetLink({ variables: { userId: u.id } })
                          if (data) setResetLink({ name: u.name, ...data.createPasswordResetLink })
                        })
                      }
                      onCancelReset={() =>
                        run(
                          () => cancelResetLink({ variables: { userId: u.id } }),
                          `Reset link for ${u.name} cancelled`,
                        )
                      }
                    />
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
