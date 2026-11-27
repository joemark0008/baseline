import { useMutation } from '@apollo/client/react'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QueryStateRow } from '@/components/QueryStateRow'
import { StakeholderDialog } from '../components/StakeholderDialog'
import { TaskDialog } from '../components/TaskDialog'
import { message, type StakeholderData } from '../lib'
import { PROJECT, REMOVE_PROJECT_STAKEHOLDER } from '../operations'
import { useProject } from './context'

/** US5: the stakeholder directory; a meeting action becomes a task from here (FR-019). */
export function ProjectStakeholdersTab() {
  const { project } = useProject()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<StakeholderData | null>(null)
  const [removing, setRemoving] = useState<StakeholderData | null>(null)
  const [actionFor, setActionFor] = useState<StakeholderData | null>(null)
  const [remove] = useMutation(REMOVE_PROJECT_STAKEHOLDER, { refetchQueries: [PROJECT] })

  async function confirmRemove(): Promise<string | null> {
    if (!removing) return null
    try {
      await remove({ variables: { id: removing.id } })
    } catch (e) {
      return message(e)
    }
    toast.success(`${removing.name} removed`)
    return null
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Stakeholders</CardTitle>
            <CardDescription>
              Hospital and vendor contacts and their implementation roles. Contacts are not project
              members.
            </CardDescription>
          </div>
          {project.can.manage ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              Add stakeholder
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <Table aria-label="Stakeholders">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <QueryStateRow
                colSpan={5}
                loading={false}
                error={null}
                isEmpty={project.stakeholders.length === 0}
                emptyMessage="No stakeholders yet."
              />
              {project.stakeholders.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-medium">{s.name}</p>
                    {s.notes ? <p className="text-xs text-muted-foreground">{s.notes}</p> : null}
                  </TableCell>
                  <TableCell>{s.organization}</TableCell>
                  <TableCell className="text-muted-foreground">{s.role}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.email ? (
                      <a href={`mailto:${s.email}`} className="hover:underline">
                        {s.email}
                      </a>
                    ) : null}
                    {s.email && s.phone ? ' · ' : ''}
                    {s.phone}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${s.name}`}>
                          <MoreHorizontal aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setActionFor(s)}>
                          Record a meeting action as a task
                        </DropdownMenuItem>
                        {project.can.manage ? (
                          <>
                            <DropdownMenuItem onSelect={() => setEditing(s)}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(s)}>
                              Remove
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {adding ? <StakeholderDialog projectId={project.id} onOpenChange={setAdding} /> : null}
      {editing ? (
        <StakeholderDialog
          key={editing.id}
          projectId={project.id}
          stakeholder={editing}
          onOpenChange={(open) => (open ? null : setEditing(null))}
        />
      ) : null}
      {actionFor ? (
        <TaskDialog
          open
          onOpenChange={(open) => (open ? null : setActionFor(null))}
          project={project}
          initial={{
            title: `Action with ${actionFor.name}`,
            description: `Meeting action involving ${actionFor.name} (${actionFor.organization}, ${actionFor.role}).`,
          }}
        />
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? null : setRemoving(null))}
        title={`Remove ${removing?.name ?? 'stakeholder'}?`}
        description="The contact is removed from this project's directory."
        confirmLabel="Remove"
        onConfirm={confirmRemove}
      />
    </>
  )
}
