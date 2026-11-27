# Data Model: Project Management Workspace Redesign with Drag and Drop

Prisma file: `apps/api/prisma/schema/projects.prisma`. One migration:
`apps/api/prisma/migrations/<ts>_add_task_position/`. Only one stored field is new; everything
else is behaviour over existing models.

## Changed model

- `ProjectTask.position Float @default(0)` with `@@index([projectId, position])`.
  - Meaning: the single manual order of tasks within a project (FR-005). Lower comes first.
  - Migration backfill: `position = row_number() OVER (PARTITION BY "projectId" ORDER BY "createdAt", "id")`.
  - Rules (`TasksService`):
    - `create` sets `position = (max position in project) + 1`.
    - `move(input, actorId)` with `MoveTaskInput { id, status?, phaseId?, afterTaskId?, beforeTaskId? }`:
      - `phaseId`, `afterTaskId`, `beforeTaskId` must belong to the same project
        ("Phase not found in this project" / "Task not found in this project").
      - New position: both neighbours → midpoint; only `afterTaskId` → `after.position + 1`
        when it is the last task, else midpoint with its successor; only `beforeTaskId` →
        symmetrical; neither → unchanged position.
      - If `|before − after| < 1e-6`, renumber every task of the project 1..n in the same
        transaction, then place.
      - If the resulting `status`, `phaseId` and `position` equal the current values, return
        the task without writing and without an activity row (FR-013).
      - Otherwise update in one transaction and record `TASK_UPDATED` with a summary of what
        changed: `moved task <title> to In progress`, `moved task <title> to phase <name>`,
        `reordered task <title>`; several changes join with ", ".
    - A move never changes dates, owner or predecessor (spec edge case: dragging into Complete).

## Existing models, new behaviour

- `ProjectDeliverable.order` / `phaseId`: `DeliverablesService.move(input, actorId)` with
  `MoveDeliverableInput { id, phaseId?, afterId?, beforeId? }` re-parents and renumbers the
  deliverables of the target phase 1..n (integers; a phase holds few deliverables). Same-project
  checks and the no-op rule as tasks. Records `DELIVERABLE_UPDATED` ("moved deliverable <title>
  to phase <name>" / "reordered deliverable <title>").
- `ProjectPhase.order`: unchanged; drag reorder calls the existing `reorderProjectPhases`.
- `ProjectPhase.startDate/endDate`, `ProjectTask.startDate/dueDate`: timeline drags call the
  existing update mutations; existing rules apply (`endDate >= startDate`, `dueDate >= startDate`).

## Derived values (composed read, not stored)

- `ProjectTask.predecessorConflict: Boolean` = the task has a predecessor with a `dueDate`, the
  task has a `startDate`, and `startDate < predecessor.dueDate` (FR-019, warning only).
- `ProjectListItem.myOpenTasks: Int` = count of the caller's tasks in that project with status
  ≠ `COMPLETE`.
- `ProjectActivity` filtered by `targetId` when the new optional argument is given.

## Client-only state (not persisted on the server)

- **View preference** (`localStorage` key `baseline.project-view.<projectId>`):
  `{ view: 'board' | 'list' | 'timeline', search: WorkSearch }`. Read on `/projects/$id/work`,
  written whenever the view or search changes. Absent or unreadable storage falls back to Board
  with no filters.
- **WorkSearch** (route search params on `/projects/$id`): `phase?: string`, `owner?: string`,
  `status?: TaskStatus`, `overdue?: boolean`, `department?: string`, `sort?: 'manual' | 'due' |
'title'` (default `manual`; any other sort disables drag reordering in the List).
- **Optimistic move overrides**: `Map<taskId, { status?, phaseId?, position? }>` held by
  `useOptimisticMoves` for the duration of a pending move.
