# Data Model: HIS Implementation Project Workspace (increment 2)

Prisma file: `apps/api/prisma/schema/projects.prisma`. Calendar dates are `DateTime @db.Date` in
the database and `YYYY-MM-DD` strings in GraphQL. Every table maps to snake_case.

## Enums

- `ProjectRole`: `MANAGER`, `MEMBER`
- `ProjectStatus`: `ACTIVE`, `ON_HOLD`, `COMPLETE`
- `PhaseStatus`: `UPCOMING`, `IN_PROGRESS`, `AT_RISK`, `COMPLETE`
- `TaskStatus`: `UPCOMING`, `IN_PROGRESS`, `BLOCKED`, `COMPLETE` (overdue is derived: `dueDate < today` and not `COMPLETE`)
- `TaskPriority`: `HIGH`, `MEDIUM`, `LOW`
- `DeliverableKind`: `OUTPUT` (a phase output), `DATA_CATEGORY` (master-data readiness item)
- `DeliverableStatus`: `NOT_STARTED`, `IN_PROGRESS`, `IN_REVIEW`, `READY`
- `ReviewOutcome`: `APPROVED`, `CHANGES_REQUESTED`
- `ProjectActivityKind`: `PROJECT_CREATED`, `PROJECT_UPDATED`, `PHASE_ADDED`, `PHASE_UPDATED`, `PHASE_REMOVED`, `PHASES_REORDERED`, `TASK_CREATED`, `TASK_UPDATED`, `TASK_DELETED`, `COMMENT_ADDED`, `MEMBER_ADDED`, `MEMBER_INVITED`, `MEMBER_ROLE_CHANGED`, `MEMBER_REMOVED`, `DELIVERABLE_ADDED`, `DELIVERABLE_UPDATED`, `DELIVERABLE_REVIEWED`, `DELIVERABLE_REMOVED`, `STAKEHOLDER_ADDED`, `STAKEHOLDER_UPDATED`, `STAKEHOLDER_REMOVED`

## Template (administrator-maintained, FR-002, FR-015)

- `TemplatePhase { id, name (1–80), description?, order Int, deliverables TemplateDeliverable[] }` — seeded with the nine lifecycle phases in spec order.
- `TemplateDeliverable { id, templatePhaseId, title (1–120), kind, order }` — seeded suggestions; `DATA_CATEGORY` rows under Data Gathering and Data Build-Up: departments, services, users, items, pricing, diagnostic tests, suppliers, codes.
- Rules: only `projects:edit` (Admin by default) may change the template; changes affect projects created afterwards only.

## Project aggregate

- `Project { id, name (2–120), hospitalName (2–120), description?, status, startDate?, targetGoLiveDate?, createdById → User, createdAt, updatedAt }`
  - Rule: `targetGoLiveDate >= startDate` when both set.
- `ProjectMember { projectId, userId, role ProjectRole, addedAt }` PK `(projectId, userId)`
  - Rules: creator is the first `MANAGER`; a project keeps ≥ 1 `MANAGER` (removing or demoting the last one is refused); a deactivated user stays listed until removed.
- `ProjectPhase { id, projectId, name (1–80), description?, order Int, ownerId? → User (SetNull), startDate?, endDate?, status PhaseStatus, templatePhaseId? }`
  - Rules: `endDate >= startDate`; `order` unique per project; removing a phase with tasks or deliverables is refused ("move them first").
- `ProjectTask { id, projectId, phaseId → ProjectPhase (Restrict), title (1–160), description?, ownerId? → User (SetNull), status, priority, startDate?, dueDate?, predecessorId? → ProjectTask (SetNull), createdById, createdAt, updatedAt }`
  - Rules: `dueDate >= startDate`; predecessor must belong to the same project, not be the task itself, and must not create a cycle (walk predecessors up to 1000 hops); `overdue = dueDate < today && status != COMPLETE`.
- `TaskComment { id, taskId → ProjectTask (Cascade), authorId → User (Restrict), body (1–4000), createdAt, mentions TaskCommentMention[] }`
- `TaskCommentMention { commentId, userId }` PK `(commentId, userId)`; mentioned users must be project members.
- `ProjectDeliverable { id, projectId, phaseId → ProjectPhase (Restrict), title (1–160), kind, ownerId? → User (SetNull), reviewerId? → User (SetNull), dueDate?, status, reviewOutcome?, reviewNote?, reviewedAt?, links Json ([{label,url}], ≤ 20), order Int, templateDeliverableId? }`
- `ProjectStakeholder { id, projectId, name (1–120), organization (1–120), role (1–120), email?, phone?, userId? → User (SetNull), notes? }`
  - Rule: a stakeholder is a contact; linking `userId` does not grant membership.
- `ProjectActivity { id, projectId, actorId? → User (SetNull), kind, targetType?, targetId?, summary (≤ 300), details Json?, createdAt }` index `(projectId, createdAt desc)`

## Invite extension

- `Invite.projectId? → Project (Cascade)`, `Invite.projectRole? ProjectRole`. On accept, when set, a `ProjectMember` row is created (idempotent) and `MEMBER_ADDED` activity is recorded.

## Derived values (computed in services, not stored)

- `Project.summary`: `totalTasks`, `openTasks`, `overdueTasks`, `completePhases`, `phaseCount`, `progress` (= complete phases ÷ phases, or 100 when every task is complete and no phases exist).
- `Project.myRole`, `Project.can { manage, edit }`.

## Permission seed

Migration `20261127010000_member_projects_view` grants `projects:view` to the built-in Member role
so that a person who accepts a project invite can open the project; Admin holds every permission
by rule, and custom roles are granted it in Settings › Roles.
