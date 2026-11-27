import { registerEnumType } from '@nestjs/graphql'

// Mirrors of the Prisma enums in prisma/schema/projects.prisma. Features never import the
// generated client, so the string values are declared again here and registered for GraphQL.

export enum ProjectRole {
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
}
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETE = 'COMPLETE',
}
export enum PhaseStatus {
  UPCOMING = 'UPCOMING',
  IN_PROGRESS = 'IN_PROGRESS',
  AT_RISK = 'AT_RISK',
  COMPLETE = 'COMPLETE',
}
export enum TaskStatus {
  UPCOMING = 'UPCOMING',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  COMPLETE = 'COMPLETE',
}
export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}
export enum DeliverableKind {
  OUTPUT = 'OUTPUT',
  DATA_CATEGORY = 'DATA_CATEGORY',
}
export enum DeliverableStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  READY = 'READY',
}
export enum ReviewOutcome {
  APPROVED = 'APPROVED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}
/** Sort orders for the projects list (feature 010). */
export enum ProjectsSort {
  RECENT = 'RECENT',
  GO_LIVE = 'GO_LIVE',
}
/** Sort orders for a task list: manual position (default) or the old due-date order. */
export enum TaskSort {
  POSITION = 'POSITION',
  DUE_DATE = 'DUE_DATE',
}
export enum ProjectActivityKind {
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PHASE_ADDED = 'PHASE_ADDED',
  PHASE_UPDATED = 'PHASE_UPDATED',
  PHASE_REMOVED = 'PHASE_REMOVED',
  PHASES_REORDERED = 'PHASES_REORDERED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  MEMBER_ADDED = 'MEMBER_ADDED',
  MEMBER_INVITED = 'MEMBER_INVITED',
  MEMBER_ROLE_CHANGED = 'MEMBER_ROLE_CHANGED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  DELIVERABLE_ADDED = 'DELIVERABLE_ADDED',
  DELIVERABLE_UPDATED = 'DELIVERABLE_UPDATED',
  DELIVERABLE_REVIEWED = 'DELIVERABLE_REVIEWED',
  DELIVERABLE_REMOVED = 'DELIVERABLE_REMOVED',
  STAKEHOLDER_ADDED = 'STAKEHOLDER_ADDED',
  STAKEHOLDER_UPDATED = 'STAKEHOLDER_UPDATED',
  STAKEHOLDER_REMOVED = 'STAKEHOLDER_REMOVED',
}

registerEnumType(ProjectRole, { name: 'ProjectRole' })
registerEnumType(ProjectStatus, { name: 'ProjectStatus' })
registerEnumType(PhaseStatus, { name: 'PhaseStatus' })
registerEnumType(TaskStatus, { name: 'TaskStatus' })
registerEnumType(TaskPriority, { name: 'TaskPriority' })
registerEnumType(DeliverableKind, { name: 'DeliverableKind' })
registerEnumType(DeliverableStatus, { name: 'DeliverableStatus' })
registerEnumType(ReviewOutcome, { name: 'ReviewOutcome' })
registerEnumType(ProjectActivityKind, { name: 'ProjectActivityKind' })
registerEnumType(ProjectsSort, { name: 'ProjectsSort' })
registerEnumType(TaskSort, { name: 'TaskSort' })
