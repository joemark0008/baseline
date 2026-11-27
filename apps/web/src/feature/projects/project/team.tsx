import { useMutation } from '@apollo/client/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { ProjectRole } from '@/graphql/codegen/graphql'
import { MemberDialog } from '../components/MemberDialog'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime, initials, message, type MemberData } from '../lib'
import { PROJECT, REMOVE_PROJECT_MEMBER, SET_PROJECT_MEMBER_ROLE } from '../operations'
import { useProject } from './context'

/** US3: who is on the project, their project role, and pending email invites. */
export function ProjectTeamTab() {
  const { project } = useProject()
  const { current } = useCurrentUser()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<MemberData | null>(null)
  const [setRole] = useMutation(SET_PROJECT_MEMBER_ROLE, { refetchQueries: [PROJECT] })
  const [removeMember] = useMutation(REMOVE_PROJECT_MEMBER, { refetchQueries: [PROJECT] })

  async function changeRole(member: MemberData, role: string) {
    try {
      await setRole({
        variables: { projectId: project.id, userId: member.user.id, role: role as ProjectRole },
      })
      toast.success(`${member.user.name} is now a ${role === 'MANAGER' ? 'Manager' : 'Member'}`)
    } catch (e) {
      toast.error(message(e))
    }
  }

  async function confirmRemove(): Promise<string | null> {
    if (!removing) return null
    try {
      await removeMember({ variables: { projectId: project.id, userId: removing.user.id } })
    } catch (e) {
      return message(e)
    }
    toast.success(`${removing.user.name} removed from the project`)
    return null
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Project team</CardTitle>
            <CardDescription>
              Hospital and vendor participants. A project always keeps at least one Manager.
            </CardDescription>
          </div>
          {project.can.manage ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              Add participant
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <Table aria-label="Project members">
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Project role</TableHead>
                <TableHead>Added</TableHead>
                {project.can.manage ? (
                  <TableHead className="w-24">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.members.map((m) => (
                <TableRow key={m.user.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <Avatar size="sm" aria-label={m.user.name}>
                        <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {m.user.name}
                          {current?.user.id === m.user.id ? ' (you)' : ''}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {m.user.email}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {project.can.manage ? (
                      <NativeSelect
                        aria-label={`Project role of ${m.user.name}`}
                        value={m.role}
                        onChange={(e) => changeRole(m, e.target.value)}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="MANAGER">Manager</option>
                      </NativeSelect>
                    ) : (
                      <StatusBadge value={m.role} />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(m.addedAt)}
                  </TableCell>
                  {project.can.manage ? (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setRemoving(m)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {project.can.manage ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>People invited by email who have not joined yet.</CardDescription>
          </CardHeader>
          <CardContent>
            {project.pendingInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              <Table aria-label="Pending invitations">
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.pendingInvites.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.email}</TableCell>
                      <TableCell>
                        <StatusBadge value={i.role} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(i.expiresAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}
      {adding ? <MemberDialog projectId={project.id} onOpenChange={setAdding} /> : null}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? null : setRemoving(null))}
        title={`Remove ${removing?.user.name ?? 'member'} from the project?`}
        description="They lose access to this project. Their past changes stay in the activity history."
        confirmLabel="Remove"
        onConfirm={confirmRemove}
      />
    </>
  )
}
