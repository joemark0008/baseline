import type { PrismaTx } from '../../prisma/prisma.service.js'

export type AccessChangeKind =
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'USER_ROLE_CHANGED'
  | 'USER_DEACTIVATED'
  | 'USER_REACTIVATED'
  | 'PASSWORD_RESET_LINK_CREATED'
  | 'PASSWORD_RESET_LINK_CANCELLED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'PASSWORD_CHANGED'

/** Snapshot stored in `access_change.before` / `after`. */
export type Snapshot = {
  name?: string
  description?: string | null
  grants?: string[]
  user?: string
  role?: string
}

export interface AccessChangeEntry {
  actorId: string | null
  kind: AccessChangeKind
  roleId?: string | null
  userId?: string | null
  before?: Snapshot | null
  after?: Snapshot | null
}

/** Writes the audit record. Always call it inside the transaction that makes the change (FR-016). */
export async function recordAccessChange(tx: PrismaTx, entry: AccessChangeEntry): Promise<void> {
  await tx.accessChange.create({
    data: {
      actorId: entry.actorId,
      kind: entry.kind,
      roleId: entry.roleId ?? null,
      userId: entry.userId ?? null,
      before: entry.before ?? undefined,
      after: entry.after ?? undefined,
    },
  })
}

/** One line for the History page, built from the snapshots. */
export function summarizeChange(
  kind: string,
  before: Snapshot | null,
  after: Snapshot | null,
): string {
  switch (kind) {
    case 'ROLE_CREATED': {
      const grants = after?.grants ?? []
      return `Created role "${after?.name}" with ${grants.length ? grants.join(', ') : 'no permissions'}`
    }
    case 'ROLE_UPDATED': {
      const parts: string[] = []
      if (before?.name !== after?.name) parts.push(`renamed from "${before?.name}"`)
      if ((before?.description ?? null) !== (after?.description ?? null)) {
        parts.push('description changed')
      }
      const was = new Set(before?.grants ?? [])
      const now = new Set(after?.grants ?? [])
      const diff = [
        ...[...now].filter((g) => !was.has(g)).map((g) => `+${g}`),
        ...[...was].filter((g) => !now.has(g)).map((g) => `-${g}`),
      ]
      if (diff.length) parts.push(diff.join(', '))
      return `Role "${after?.name}": ${parts.length ? parts.join('; ') : 'no changes'}`
    }
    case 'ROLE_DELETED':
      return `Deleted role "${before?.name}"`
    case 'USER_ROLE_CHANGED':
      return `${after?.user}: ${before?.role} → ${after?.role}`
    case 'USER_DEACTIVATED':
      return `Deactivated ${after?.user}`
    case 'USER_REACTIVATED':
      return `Reactivated ${after?.user}`
    case 'PASSWORD_RESET_LINK_CREATED':
      return `Created a password reset link for ${after?.user}`
    case 'PASSWORD_RESET_LINK_CANCELLED':
      return `Cancelled the password reset link for ${after?.user}`
    case 'PASSWORD_RESET_COMPLETED':
      return `${after?.user} set a new password with a reset link`
    case 'PASSWORD_CHANGED':
      return `${after?.user} changed their password`
    default:
      return kind
  }
}
