# Implementation Plan: Project Management Workspace Redesign with Drag and Drop

**Branch**: `010-pm-workspace-redesign` | **Date**: 2026-11-27 | **Spec**: `specs/010-pm-workspace-redesign/spec.md`

**Input**: Feature specification from `/specs/010-pm-workspace-redesign/spec.md`

## Summary

The project workspace becomes a work-centred project management app: a Board (columns by
status), a List (groups by phase with quick-add and inline editing) and an interactive Timeline,
all driven by drag and drop with keyboard, menu and screen-reader equivalents; phases and
deliverables reorder by drag; a compact header with a view switcher; a task side panel with
inline editing and per-task activity; remembered view and filters per project; and a projects
list of cards. Server-side the change is small: one stored field (`ProjectTask.position`), two
move mutations, two derived fields, and sort/filter arguments on existing queries. The web adds
`@dnd-kit` (pinned, research.md › Decision 1), a shared `dnd/` folder, three view components and
the redesigned layout, all on shadcn primitives.

## Technical Context

**Language/Version**: TypeScript 6 on Node.js 22; NestJS 12, React 19

**Primary Dependencies**: Existing stack plus `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/modifiers@9.0.0`, `@dnd-kit/utilities@3.2.2` in `apps/web` (peer `react >=16.8`, verified against the registry on 2026-11-27). No API dependencies added. shadcn `progress`, `collapsible`, `select`, `sheet`, `tooltip`, `dropdown-menu`, `badge`, `card`, `input` already exist in `src/components/ui/`.

**Storage**: PostgreSQL 16 (shared instance). One migration: `project_task.position DOUBLE PRECISION NOT NULL DEFAULT 0`, backfilled from creation order, index `(projectId, position)`. See `data-model.md`.

**Testing**: Unit specs beside services (fake `PrismaService`), resolver specs, `apps/api/test/workspace.e2e-spec.ts` against `DATABASE_URL`; web: Vitest + React Testing Library for pure functions (`lib.ts`, `dnd/`), the optimistic-move reducer, Board, List, Gantt interaction (keyboard paths; pointer drags simulated with the dnd-kit keyboard sensor), the layout and the view-preference hook.

**Target Platform**: The two existing containers; no new env vars. Node and npm run inside the dev container on the server (`docker exec web-<uuid>`), so `npm install` of the new packages and the lockfile update happen there.

**Project Type**: Web application (api + web)

**Performance Goals**: Board and List with 300 tasks open in under 2 s and give drag feedback within 100 ms (SC-006): rendering is plain lists without virtualisation, memoised per column/group; a move is one row update server-side (midpoint position), renumbering only when gaps vanish.

**Constraints**: Every drag has a keyboard and menu equivalent and live-region announcements (FR-009); every drop is optimistic with rollback and a reason (FR-010); no-op drops write nothing (FR-013); drag-driven changes record activity exactly like form changes (FR-011); Members never see or can use phase handles and the server refuses them (FR-018); touch press-and-hold and reduced motion respected (FR-012); non-members `NotFound`.

**Scale/Scope**: Hundreds of tasks per project; three work views, two plan lists, one side panel, one list page; two new mutations, four changed queries/types.

## Constitution Check

- **I. Single Responsibility**: `TasksService.move` and `DeliverablesService.move` own placement rules; `TasksService.create` sets the initial position; `ProjectsService.listMine` computes `myOpenTasks`; mappers compute `predecessorConflict`. On the web, `dnd/` holds sensors, announcements and the move reducer; `lib.ts` holds ordering, grouping and timeline geometry as pure functions; `Board`, `TaskList`, `Gantt` render and dispatch; `ProjectLayout` lays out; `view-preferences.ts` persists.
- **II. Open/Closed**: Views are new routes and components; `Gantt` gains optional callbacks (absent = read-only, existing tests still hold); `TaskDetailSheet` gains inline editors as new child components; `TasksService.update` is untouched (the move is a new method). Sort options are enums; a new work view would be a new route plus an entry in the switcher list.
- **III. Liskov Substitution**: No new interface with multiple implementations.
- **IV. Interface Segregation**: `Board` takes `{ tasks, phases, members, canEdit, onMove, onOpen }`; `TaskList` takes groups plus `onMove`, `onQuickAdd`, `onInlineChange`; `Gantt` takes phases plus optional date callbacks; cards and rows take the generated row types they render. Services expose `move` with one input object.
- **V. Dependency Inversion**: Rules stay in services (same-project checks, midpoint/renumber, no-op detection, date range); resolvers map arguments and the session user; the web computes gestures into field values and calls generated operations; it reads `project.can`, `task.predecessorConflict` and `myOpenTasks` rather than deriving them.
- **Technology Stack**: Prisma migration committed; `schema.graphql` regenerated; generated documents and types only; file-based routes with `validateSearch` on the project route; shadcn primitives; every new resolver behind the global guard plus `@RequirePermission('projects', 'view')` with project-role rules in services.
- **Simplicity**: One new library, justified by FR-009/FR-012/FR-007 (research.md › Decision 1); no repository layer, no virtualisation, no cache surgery (override map instead), no server-side preferences.
- **Design before code**: services, resolvers, DTOs, entities, migration, routes and components are listed below.
- **Tests**: Red-green per story; e2e covers the move rules, no-op rule, renumbering, sort and `myOpenTasks`, and Member/non-member denial.

**Gate result (pre-research)**: Pass. **Gate result (post-design)**: Pass; no deviations, Complexity Tracking is empty.

## Permission model

Unchanged (FR-018). `projects:view` gates the queries and project mutations; inside a project the
role decides: Members move, edit and create tasks and deliverables (including by drag); only
Managers reorder phases and move phase bars; non-members get `NotFound`. The web hides handles
and menu items the person cannot use; services enforce again.

## Project Structure

### Documentation (this feature)

```text
specs/010-pm-workspace-redesign/
├── spec.md
├── plan.md                       # this file
├── research.md                   # decisions 1–12
├── data-model.md                 # position field, move rules, client state
├── contracts/graphql.md          # types, queries, mutations, web documents
├── contracts/ui-interaction.md   # sensors, keyboard map, announcements, feedback
├── quickstart.md
└── tasks.md                      # /speckit-tasks output (not created here)
```

### Source Code

```text
apps/api/prisma/schema/projects.prisma                  ProjectTask.position Float + index
apps/api/prisma/migrations/<ts>_add_task_position/      column, backfill, index
apps/api/src/feature/projects/
├── entities/enums.ts                                   + ProjectsSort, TaskSort
├── entities/project.entity.ts                          ProjectTask.position, predecessorConflict; ProjectListItem.myOpenTasks
├── dto/task.input.ts                                   + MoveTaskInput
├── dto/deliverable.input.ts                            + MoveDeliverableInput
├── dto/project.input.ts                                + sort args (projects, projectTasks, projectActivity targetId)
├── mappers.ts                                          tasks ordered by position; predecessorConflict from a project-wide task map; toListItem myOpenTasks
├── tasks.service.ts (+spec)                            create sets position; move(input, actorId); list sort
├── deliverables.service.ts (+spec)                     move(input, actorId)
├── projects.service.ts (+spec)                         listMine(sort, userId) with filtered _count; activity(targetId)
├── tasks.resolver.ts, deliverables.resolver.ts, projects.resolver.ts   moveProjectTask, moveProjectDeliverable, new args
apps/api/test/workspace.e2e-spec.ts                     move rules, no-op, renumber, sort, myOpenTasks, denial
apps/api/schema.graphql                                 regenerated
apps/web/package.json, package-lock.json                + @dnd-kit/* (installed in the dev container)
apps/web/src/feature/projects/
├── operations.ts                                       PROJECT/PROJECT_LIST/PROJECT_ACTIVITY changes; MOVE_PROJECT_TASK, MOVE_PROJECT_DELIVERABLE
├── lib.ts (+test)                                      orderByPosition, columnsByStatus, groupByPhase, neighboursFor(list, activeId, overId), deltaToDays, shiftDates, resizeDate, WorkSearch schema
├── view-preferences.ts (+test)                         readViewPreference/writeViewPreference (localStorage, try/catch)
├── dnd/sensors.ts                                      useWorkSensors()
├── dnd/announcements.ts (+test)                        text for pick-up/over/drop/cancel
├── dnd/use-optimistic-moves.ts (+test)                 override map reducer + hook around MOVE_PROJECT_TASK
├── dnd/SortableHandle.tsx                              grip handle with aria attributes
├── project/layout.tsx                                  compact header, Work switcher (carries search), Pages nav
├── project/work-search.ts                              validateSearch schema + useWorkSearch()
├── project/work-filters.tsx                            shared filter bar (phase, owner, status, overdue, department, sort)
├── project/board.tsx                                   Board view route component
├── project/list.tsx                                    List view route component
├── project/timeline.tsx                                wires Gantt callbacks to updateProjectTask/updateProjectPhase
├── project/overview.tsx                                phase list becomes sortable (handle for Managers; arrows stay in the menu)
├── project/readiness.tsx                               deliverables sortable within and across phases
├── project/tasks.tsx                                   removed (route redirects)
├── components/Board.tsx (+test), BoardColumn.tsx, BoardCard.tsx
├── components/TaskList.tsx (+test), TaskListGroup.tsx, TaskListRow.tsx, QuickAddRow.tsx
├── components/Gantt.tsx (+test)                        optional onTaskDatesChange/onPhaseDatesChange; draggable bars, edge handles, keyboard shifting, tooltip
├── components/TaskDetailSheet.tsx                      inline editors (InlineField.tsx), per-task activity
├── components/ProjectCard.tsx                          projects list card
├── components/use-shortcut.ts (+test)                  'n' quick-add shortcut
├── index.tsx                                           card grid + sort toggle
apps/web/src/routes/_protected/projects/$id.tsx         validateSearch(WorkSearch)
apps/web/src/routes/_protected/projects/$id/board.tsx, list.tsx, work.tsx (redirect to remembered view), tasks.tsx (redirect → list)
apps/web/src/lib/navigation.ts                          breadcrumbs for board/list/work
```

**Structure Decision**: Views are route components under `project/`, presentational drag
surfaces under `components/`, and everything drag-generic under `dnd/`, so the same sensors,
announcements and optimistic reducer serve Board, List, Overview and Readiness. The API keeps
the existing module and adds methods rather than services: a move is one more operation on the
task and deliverable aggregates.

## Module wiring

- No new Nest modules or providers. `TasksService.move` and `DeliverablesService.move` are new
  methods on existing services; `ProjectsService.listMine` gains `sort` and the caller id for
  `myOpenTasks`; resolvers gain one mutation and the new arguments each.
- Web: `ProjectLayout` provides the project through the existing `ProjectContext`; the Work
  views read `useWorkSearch()` from the route and `useOptimisticMoves()` from `dnd/`;
  `work.tsx` reads the preference and redirects; views write the preference on mount and when
  the search changes.

## Deployment Notes

- `prisma migrate deploy` applies the position backfill on the next deploy of `baseline` and the
  next restart of `baseline-dev`.
- `npm install` for `@dnd-kit/*` runs inside the dev container; the updated `package-lock.json`
  is committed so the image build (`npm ci`) picks it up. Rebuild both images and redeploy
  `baseline`; `baseline-dev` picks the code up live.

## Complexity Tracking

No deviations from the constitution; nothing to justify.
