import { MoreHorizontal } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { TableCell, TableRow } from '@/components/ui/table'

export interface RowUser {
  id: string
  name: string
  email: string
  username?: string | null
  accessRole: { id: string; name: string; kind: string }
  deactivated: boolean
  createdAt: unknown
  /** Decided by the server for the signed-in caller; this row only shows what it allows. */
  can: {
    edit: boolean
    changeRole: boolean
    deactivate: boolean
    reactivate: boolean
    resetPassword: boolean
  }
  /** Set (for Admin callers) when a password reset link is waiting to be used. */
  passwordResetExpiresAt?: unknown
}

export function UserRow({
  user,
  isSelf = false,
  roleOptions,
  onSetRole,
  onUpdate,
  onDeactivate,
  onReactivate,
  onResetPassword,
  onCancelReset,
}: {
  user: RowUser
  /** Only labels the row "(you)". */
  isSelf?: boolean
  /** Roles the caller may assign, already filtered by the server. */
  roleOptions: ReadonlyArray<{ id: string; name: string }>
  onSetRole: (roleId: string) => void
  onUpdate: (changes: { name: string; username: string | null }) => Promise<boolean>
  /** Resolves to an error message, or null once the user is deactivated. */
  onDeactivate: () => Promise<string | null>
  onReactivate: () => void
  onResetPassword: () => void
  /** Resolves to an error message, or null once the link is cancelled. */
  onCancelReset: () => Promise<string | null>
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState<'deactivate' | 'cancel-reset' | null>(null)
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username ?? '')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (await onUpdate({ name: name.trim(), username: username.trim() || null })) setEditing(false)
  }

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={6}>
          <form onSubmit={save} className="flex flex-wrap items-end gap-2">
            <Input
              aria-label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-48"
            />
            <Input
              aria-label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-40"
            />
            <span className="text-xs text-muted-foreground">
              {user.email} (email can't be changed)
            </span>
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </form>
        </TableCell>
      </TableRow>
    )
  }

  const hasActions =
    user.can.edit || user.can.resetPassword || user.can.reactivate || user.can.deactivate

  return (
    <TableRow>
      <TableCell className="font-medium">
        {user.name}
        {isSelf ? (
          <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
        ) : null}
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell className="text-muted-foreground">{user.username ?? '—'}</TableCell>
      <TableCell>
        {user.can.changeRole ? (
          <NativeSelect
            aria-label={`Role of ${user.name}`}
            value={user.accessRole.id}
            onChange={(e) => onSetRole(e.target.value)}
            className="h-8 w-36"
          >
            {roleOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
        ) : (
          <Badge variant={user.accessRole.kind === 'ADMIN' ? 'default' : 'secondary'}>
            {user.accessRole.name}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={user.deactivated ? 'outline' : 'secondary'}>
          {user.deactivated ? 'Deactivated' : 'Active'}
        </Badge>
        {user.passwordResetExpiresAt ? (
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            Reset link pending until{' '}
            {new Date(user.passwordResetExpiresAt as string).toLocaleString()}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              aria-label="Cancel reset link"
              onClick={() => setConfirming('cancel-reset')}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </TableCell>
      <TableCell className="text-right">
        {hasActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user.can.edit ? (
                <DropdownMenuItem onSelect={() => setEditing(true)}>Edit</DropdownMenuItem>
              ) : null}
              {user.can.resetPassword ? (
                <DropdownMenuItem onSelect={onResetPassword}>Reset password</DropdownMenuItem>
              ) : null}
              {user.can.reactivate ? (
                <DropdownMenuItem onSelect={onReactivate}>Reactivate</DropdownMenuItem>
              ) : null}
              {user.can.deactivate ? (
                <>
                  {user.can.edit || user.can.resetPassword ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setConfirming('deactivate')}
                  >
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <ConfirmDialog
          open={confirming === 'deactivate'}
          onOpenChange={(open) => setConfirming(open ? 'deactivate' : null)}
          title={`Deactivate ${user.name}?`}
          description={`${user.name} is signed out everywhere and can't sign in until reactivated.`}
          confirmLabel="Deactivate"
          onConfirm={onDeactivate}
        />
        <ConfirmDialog
          open={confirming === 'cancel-reset'}
          onOpenChange={(open) => setConfirming(open ? 'cancel-reset' : null)}
          title={`Cancel the reset link for ${user.name}?`}
          description="The link stops working. You can create a new one at any time."
          confirmLabel="Cancel link"
          onConfirm={onCancelReset}
        />
      </TableCell>
    </TableRow>
  )
}
