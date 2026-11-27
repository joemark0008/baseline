import type { PrismaTx } from '../../prisma/prisma.service.js'

export type ProjectActivityKind =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PHASE_ADDED'
  | 'PHASE_UPDATED'
  | 'PHASE_REMOVED'
  | 'PHASES_REORDERED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'COMMENT_ADDED'
  | 'MEMBER_ADDED'
  | 'MEMBER_INVITED'
  | 'MEMBER_ROLE_CHANGED'
  | 'MEMBER_REMOVED'
  | 'DELIVERABLE_ADDED'
  | 'DELIVERABLE_UPDATED'
  | 'DELIVERABLE_REVIEWED'
  | 'DELIVERABLE_REMOVED'
  | 'STAKEHOLDER_ADDED'
  | 'STAKEHOLDER_UPDATED'
  | 'STAKEHOLDER_REMOVED'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export interface ActivityEntry {
  projectId: string
  actorId: string | null
  kind: ProjectActivityKind
  /** e.g. "task", "phase", "deliverable", "member", "stakeholder", "project" */
  targetType?: string
  targetId?: string
  /** Human-readable, ≤ 300 chars: "renamed phase Kickoff to Project kickoff". */
  summary: string
  details?: { [key: string]: JsonValue }
}

/** Writes one history row in the caller's transaction (FR-013, SC-003). */
export async function recordActivity(tx: PrismaTx, entry: ActivityEntry): Promise<void> {
  await tx.projectActivity.create({
    data: {
      projectId: entry.projectId,
      actorId: entry.actorId,
      kind: entry.kind,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      summary: entry.summary.slice(0, 300),
      details: entry.details ?? undefined,
    },
  })
}
