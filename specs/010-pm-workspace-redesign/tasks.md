---
description: 'Executable tasks for the project management workspace redesign with drag and drop (feature 010)'
---

# Tasks: Project Management Workspace Redesign with Drag and Drop

**Input**: Design documents from `/specs/010-pm-workspace-redesign/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/graphql.md`, `contracts/ui-interaction.md`, `quickstart.md`

**Tests**: Included. The constitution makes unit tests mandatory for every behaviour change;
each story's tests are written first, run to fail, then made green.

**Organization**: Grouped by user story. The task move service and the shared drag toolkit are
foundational because both P1 stories (Board, List) depend on them. Field constraints are cited
as `data-model.md › Entity.field` and not restated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on an unfinished task).
- Story labels: US1 Board, US2 List, US3 Timeline, US4 Plan drags, US5 Shell.
- Paths are repository-relative. API code in `apps/api/src/feature/projects/`, web code in `apps/web/src/feature/projects/`.

## Path Conventions

- Node and npm run inside the dev container on the server (`docker exec -it web-<service-uuid> sh`, see `plan.md › Target Platform`); run every `npm` command there and commit `package-lock.json`.
- After resolver or entity changes: `npm run schema:generate`, commit `apps/api/schema.graphql`; after `operations.ts` changes: `npm run codegen -w apps/web`.
- UI follows `.claude/skills/ui-design/SKILL.md`; primitives from `apps/web/src/components/ui/` (card, badge, button, input, select, textarea, collapsible, dropdown-menu, dialog, sheet, tooltip, progress all exist). Drag behaviour follows `contracts/ui-interaction.md` exactly.

---

## Phase 1: Setup

**Purpose**: Dependencies and a green baseline.

- [x] T001 In the dev container run `npm install -w apps/web @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/modifiers@9.0.0 @dnd-kit/utilities@3.2.2` (exact versions, `research.md › Decision 1`), confirm `apps/web/package.json` and `package-lock.json` changed, and that `npm run build -w apps/web` still passes.
- [x] T002 [P] Run `npm test -w apps/api`, `npm test -w apps/web -- --run` and `npm run test:e2e -w apps/api` against `baseline_dev` to confirm a green baseline before changes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The stored position, the move mutation, the shared search schema, the drag toolkit and the documents every view uses.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### API

- [x] T003 Add `position Float @default(0)` and `@@index([projectId, position])` to `ProjectTask` in `apps/api/prisma/schema/projects.prisma` (`data-model.md › ProjectTask.position`).
- [x] T004 Create the migration `apps/api/prisma/migrations/<timestamp>_add_task_position/migration.sql` with `npx prisma migrate dev --create-only -n add_task_position` (in `apps/api`), append the backfill `UPDATE … SET position = rn FROM (SELECT id, row_number() OVER (PARTITION BY "projectId" ORDER BY "createdAt", id) rn …)` from `data-model.md › Changed model`, apply with `npx prisma migrate dev`.
- [x] T005 [P] Add `ProjectsSort { RECENT, GO_LIVE }` and `TaskSort { POSITION, DUE_DATE }` to `apps/api/src/feature/projects/entities/enums.ts`; add `position: Float!` and `predecessorConflict: Boolean!` to `ProjectTask` and `myOpenTasks: Int!` to `ProjectListItem` in `apps/api/src/feature/projects/entities/project.entity.ts` (`contracts/graphql.md › Types`).
- [x] T006 [P] Add `MoveTaskInput { id, status?, phaseId?, afterTaskId?, beforeTaskId? }` to `apps/api/src/feature/projects/dto/task.input.ts` and `MoveDeliverableInput { id, phaseId?, afterId?, beforeId? }` to `apps/api/src/feature/projects/dto/deliverable.input.ts`; add the `sort` and `targetId` args to the relevant args classes in `apps/api/src/feature/projects/dto/project.input.ts` (`contracts/graphql.md › Queries`).
- [x] T007 Write failing cases in `apps/api/src/feature/projects/tasks.service.spec.ts`: `create` sets `position = max + 1` (and `1` for the first task); `move` places at the midpoint between neighbours, at `after + 1` when `afterTaskId` is last, at `before − 1` when `beforeTaskId` is first; renumbers 1..n when the gap is below `1e-6`; rejects a neighbour or phase from another project ("Task not found in this project" / "Phase not found in this project"); returns unchanged with no `recordActivity` call when status, phase and position are unchanged; records `TASK_UPDATED` with "moved task … to In progress" / "moved task … to phase …" / "reordered task …" joined with ", "; never touches dates, owner or predecessor (`data-model.md › ProjectTask.position` rules).
- [x] T008 Implement `TasksService.create` position assignment and `TasksService.move(input, actorId)` in `apps/api/src/feature/projects/tasks.service.ts` per `data-model.md › ProjectTask.position`, inside one `$transaction`; add `sort` to the task list query (`POSITION` default, `DUE_DATE` = old behaviour); make T007 pass.
- [x] T009 [P] Update `apps/api/src/feature/projects/mappers.ts`: order `phases[].tasks` by `position`; compute `ProjectTask.predecessorConflict` from a project-wide task map (`data-model.md › Derived values`); map `position`; make `toListItem` accept and emit `myOpenTasks`. Add cases to `apps/api/src/feature/projects/mappers.spec.ts` (create if absent) for the conflict flag (true only when both dates exist and `start < predecessor.due`).
- [x] T010 Add `moveProjectTask(input: MoveTaskInput!): ProjectTask!` (`@RequirePermission('projects','view')`, session user id → service) to `apps/api/src/feature/projects/tasks.resolver.ts`, the `sort` argument to `projectTasks`, and a forwarding assertion in `apps/api/src/feature/projects/tasks.resolver.spec.ts`; run `npm run schema:generate` and commit `apps/api/schema.graphql`.
- [x] T011 Create `apps/api/test/workspace.e2e-spec.ts` from the harness in `apps/api/test/projects.e2e-spec.ts` (admin Manager, one Member, one non-member, one project with three phases and six tasks) with cases: tasks come back ordered by `position`; `moveProjectTask` between neighbours persists and `project(id)` reflects it; a status move writes one activity row; a no-op move writes none; moving with a foreign `afterTaskId` is `BAD_USER_INPUT`; a Member can move; a non-member gets `NOT_FOUND`. Run; passes once T008–T010 are in.

### Web

- [x] T012 Update `apps/web/src/feature/projects/operations.ts`: add `position predecessorConflict` to every task selection in `PROJECT`, `PROJECT_TASK` and `PROJECT_TASKS`; add `MOVE_PROJECT_TASK` (returns `id phaseId status position`); run `npm run codegen -w apps/web`.
- [x] T013 [P] Add to `apps/web/src/feature/projects/lib.ts` with tests in `apps/web/src/feature/projects/lib.test.ts`: `orderByPosition(tasks)`, `columnsByStatus(tasks)` (four columns in the fixed order, each ordered), `groupByPhase(tasks, phases)` (phase order, each ordered), `neighboursFor(orderedIds, activeId, overId)` → `{ afterTaskId, beforeTaskId }` for a drop after/before `overId`, `applyWorkFilters(tasks, search)`, and the `WorkSearch` type + `parseWorkSearch(raw)` (`data-model.md › Client-only state › WorkSearch`, defaults `sort: 'manual'`).
- [x] T014 [P] Create `apps/web/src/feature/projects/project/work-search.ts` exporting `validateSearch` (uses `parseWorkSearch`) and `useWorkSearch()` (reads the `/_protected/projects/$id` route search, returns `{ search, setSearch }` navigating with `replace: true`); declare `validateSearch` on `apps/web/src/routes/_protected/projects/$id.tsx`.
- [x] T015 [P] Create `apps/web/src/feature/projects/dnd/sensors.ts` (`useWorkSensors()` with the activation constraints in `contracts/ui-interaction.md › Sensors`) and `apps/web/src/feature/projects/dnd/announcements.ts` with `taskAnnouncements(lookup)` returning dnd-kit `Announcements` + `screenReaderInstructions` using the exact strings in `contracts/ui-interaction.md › Announcements`; test the strings in `apps/web/src/feature/projects/dnd/announcements.test.ts`.
- [x] T016 [P] Create `apps/web/src/feature/projects/dnd/use-optimistic-moves.ts`: a pure reducer `applyMoves(tasks, overrides)` and the hook `useOptimisticMoves(projectId)` that returns `{ tasks, move(input) }`, sets the override before calling `MOVE_PROJECT_TASK` (with `refetchQueries: [PROJECT]`), clears it on success, and on error clears it and `toast.error(message)` (`research.md › Decision 5`, FR-010). Test the reducer and the error path with a mocked mutation in `apps/web/src/feature/projects/dnd/use-optimistic-moves.test.tsx`.
- [x] T017 [P] Create `apps/web/src/feature/projects/dnd/SortableHandle.tsx` (a `GripVertical` button that spreads dnd-kit `listeners`/`attributes`, `aria-label` "Drag to reorder", hidden when `disabled`) and `apps/web/src/feature/projects/project/work-filters.tsx` (the shared filter bar: phase, owner, status, overdue, department when `project.orgChart` exists, sort; reads/writes `useWorkSearch()`).

**Checkpoint**: API tests and e2e green, codegen clean, `useWorkSensors`, announcements, optimistic hook and filters exist with tests; no view yet.

---

## Phase 3: User Story 1 - Move work on a board (Priority: P1) 🎯 MVP

**Goal**: Board view with status columns; drag between columns changes status, drag within a column reorders; keyboard and menu equivalents; filters; touch; rollback on failure.

**Independent Test**: `quickstart.md` steps 2–5.

### Tests for User Story 1

- [x] T018 [P] [US1] Write `apps/web/src/feature/projects/components/Board.test.tsx`: renders four columns in the fixed order with counts; cards show title, owner initials, due date with overdue styling, priority and phase; keyboard move (focus card, Space, ArrowRight, Space) calls `onMove` with `{ id, status: 'IN_PROGRESS', afterTaskId, beforeTaskId }`; dropping on the origin calls nothing; the card menu offers "Move to <column>" and "Move up/down" and calls `onMove`; `canEdit=false` renders no handles or menu moves. Run; fails.
- [x] T019 [P] [US1] Add a route test `apps/web/src/feature/projects/project/board.test.tsx` (fixture `ProjectContext`, mocked `MOVE_PROJECT_TASK`): a failed move restores the card and shows a toast; filters from the search narrow the cards. Run; fails.

### Implementation for User Story 1

- [x] T020 [US1] Implement `apps/web/src/feature/projects/components/BoardCard.tsx` (`useSortable`, props `{ task, phaseName, canEdit, onOpen, onMoveTo(status), onMoveStep(direction) }`; `Badge` for priority and phase, department `Badge` when present, overdue date in `text-destructive`, owner `Avatar` initials, `DropdownMenu` with the menu equivalents) and `apps/web/src/feature/projects/components/BoardColumn.tsx` (`useDroppable` + `SortableContext`, header with count, highlighted while a drag is over it).
- [x] T021 [US1] Implement `apps/web/src/feature/projects/components/Board.tsx`: `DndContext` with `useWorkSensors()`, `taskAnnouncements`, `closestCorners`, `DragOverlay` (`dropAnimation` null under reduced motion), `onDragEnd` resolving the target column and `neighboursFor(...)`, skipping no-op drops, calling `onMove`; horizontal scroll container (`overflow-x-auto`, min column width) for narrow screens; make T018 pass.
- [x] T022 [US1] Implement the view `apps/web/src/feature/projects/project/board.tsx` (`ProjectBoardView`): `useProject()`, `useWorkSearch()`, `applyWorkFilters`, `useOptimisticMoves`, the `WorkFilters` bar, the `Board`, "New task" button opening `TaskDialog`, and `TaskDetailSheet` on card open; make T019 pass.
- [x] T023 [P] [US1] Add the route `apps/web/src/routes/_protected/projects/$id/board.tsx` (one line → `ProjectBoardView`) and the breadcrumb pattern for `/projects/:id/board` → "Board" in `apps/web/src/lib/navigation.ts`.
- [x] T024 [US1] Add the Work switcher (Board, List, Timeline as `Button` segmented group carrying the current search, `aria-current`) to `apps/web/src/feature/projects/project/layout.tsx` ahead of the existing tabs (the full header redesign is US5); verify `quickstart.md` steps 2–5 on `baseline-dev`.

**Checkpoint**: Board usable end to end with keyboard, touch and rollback; all tests green.

---

## Phase 4: User Story 2 - Plan work in a grouped list (Priority: P1)

**Goal**: List view grouped by phase with collapse, counts, quick-add per phase, drag between phases and within a phase, inline editing; the old table route redirects.

**Independent Test**: `quickstart.md` steps 6 and 7.

### Tests for User Story 2

- [x] T025 [P] [US2] Write `apps/web/src/feature/projects/components/TaskList.test.tsx`: groups in phase order with counts and collapse; keyboard move of a row into another group calls `onMove` with the new `phaseId` and neighbours; `sort !== 'manual'` renders rows without handles and a notice with "Use manual order" that calls `onResetSort`; `QuickAddRow` submits on Enter with the typed title and phase id, clears, and keeps focus; inline status change calls `onInlineChange(id, { status })`. Run; fails.
- [x] T026 [P] [US2] Add e2e cases to `apps/api/test/workspace.e2e-spec.ts`: `createProjectTask` with only `title` and `phaseId` succeeds with status `UPCOMING` and the highest position; `moveProjectTask` with a `phaseId` change writes "moved task … to phase …". Run; the second may already pass (verify).

### Implementation for User Story 2

- [x] T027 [P] [US2] Implement `apps/web/src/feature/projects/components/QuickAddRow.tsx` (`Input` + hidden submit; Enter creates via `CREATE_PROJECT_TASK` with `{ title, phaseId }`, `refetchQueries: [PROJECT]`, keeps focus, Escape blurs; exposes a `ref` for the `n` shortcut) and `apps/web/src/feature/projects/components/TaskListRow.tsx` (`useSortable` row: `SortableHandle`, title button → `onOpen`, inline `NativeSelect` for status and priority, `PersonSelect` for owner, `Input type=date` for due date, each saving through `onInlineChange`; overdue styling; menu with "Move to phase…" and "Move up/down").
- [x] T028 [US2] Implement `apps/web/src/feature/projects/components/TaskListGroup.tsx` (`Collapsible` per phase, header with name, count, `useDroppable`, `SortableContext` of its rows, the `QuickAddRow` at the end) and `apps/web/src/feature/projects/components/TaskList.tsx` (`DndContext` as in Board with `verticalListSortingStrategy`, cross-group drops resolving `phaseId` + neighbours, the sort notice); make T025 pass.
- [x] T029 [US2] Implement the view `apps/web/src/feature/projects/project/list.tsx` (`ProjectListView`): filters, `groupByPhase`, `useOptimisticMoves`, inline changes through `UPDATE_PROJECT_TASK` with `toast.error` on validation failure, `TaskDetailSheet` on open; "Use manual order" sets `sort: 'manual'` in the search.
- [x] T030 [P] [US2] Add the route `apps/web/src/routes/_protected/projects/$id/list.tsx`; change `apps/web/src/routes/_protected/projects/$id/tasks.tsx` to `beforeLoad: () => { throw redirect({ to: '/projects/$id/list', params, search }) }`; delete `apps/web/src/feature/projects/project/tasks.tsx`; add the "List" breadcrumb pattern in `apps/web/src/lib/navigation.ts`; remove the "Tasks" entry from `TABS` in `apps/web/src/feature/projects/project/layout.tsx`.
- [x] T031 [US2] Update `apps/web/src/feature/projects/project/stakeholders.tsx` and any other caller that linked to `/projects/$id/tasks` to link to `/projects/$id/list`; run `npm run typecheck -w apps/web`; verify `quickstart.md` steps 6–7.

**Checkpoint**: Board and List share order and filters; old `/tasks` links redirect.

---

## Phase 5: User Story 3 - Reschedule directly on the timeline (Priority: P2)

**Goal**: Drag task bars to shift dates, drag edges to resize, phase bars for Managers only, day snapping, tooltip, keyboard shifting, predecessor-conflict warning, window extension.

**Independent Test**: `quickstart.md` step 8.

### Tests for User Story 3

- [x] T032 [P] [US3] Add cases to `apps/web/src/feature/projects/lib.test.ts`: `deltaToDays` rounds to whole days; `shiftDates` moves both dates or only the due date when start is null; `resizeDate('start'|'due', days)` changes one date (`contracts/ui-interaction.md › Timeline geometry`). Run; fails.
- [x] T033 [P] [US3] Extend `apps/web/src/feature/projects/components/Gantt.test.tsx`: without callbacks bars have no drag attributes (existing behaviour); with `onTaskDatesChange`, focusing a bar and pressing `Shift+ArrowRight` then `Enter` calls it with dates shifted by 7 days; `Escape` after `ArrowLeft` calls nothing; `Alt+ArrowRight` changes only the due date; a Member (`onPhaseDatesChange` absent) sees phase bars without handles; a task with `predecessorConflict` renders the conflict cue with an accessible label. Run; fails.
- [x] T034 [P] [US3] Add an e2e case to `apps/api/test/workspace.e2e-spec.ts`: a task whose `startDate` is before its predecessor's `dueDate` returns `predecessorConflict: true`, and `updateProjectTask` with `dueDate < startDate` is `BAD_USER_INPUT`.

### Implementation for User Story 3

- [x] T035 [US3] Implement `deltaToDays`, `shiftDates`, `resizeDate` and `dayWidthFor(month)` in `apps/web/src/feature/projects/lib.ts`; make T032 pass.
- [x] T036 [US3] Extend `apps/web/src/feature/projects/components/Gantt.tsx`: optional `onTaskDatesChange`/`onPhaseDatesChange` props; bars become `useDraggable` with body and two edge handles inside a `DndContext` using `restrictToHorizontalAxis`, converting `delta.x` with `deltaToDays`; a `Tooltip` showing the pending dates during drag; `Escape` cancels; keyboard map from `contracts/ui-interaction.md`; due-only bars shift the due date only; conflict cue from `task.predecessorConflict`; the chart window extends while dragging past its edge; make T033 pass.
- [x] T037 [US3] Wire `apps/web/src/feature/projects/project/timeline.tsx`: pass `onTaskDatesChange` → `UPDATE_PROJECT_TASK` and, when `project.can.manage`, `onPhaseDatesChange` → `UPDATE_PROJECT_PHASE`, both with `refetchQueries: [PROJECT]`, `toast.error` with the server message on failure (bar returns on refetch), live-region "Saved." / "Cancelled."; apply the shared filters; verify `quickstart.md` step 8.

**Checkpoint**: Timeline interaction complete; Members cannot move phase bars.

---

## Phase 6: User Story 4 - Arrange the plan by dragging (Priority: P2)

**Goal**: Phases on Overview and deliverables on Readiness reorder by drag; deliverables move between phases; arrow menu items remain.

**Independent Test**: `quickstart.md` step 9.

### Tests for User Story 4

- [x] T038 [P] [US4] Add cases to `apps/api/src/feature/projects/deliverables.service.spec.ts`: `move` re-parents to the target phase and renumbers that phase 1..n; rejects a phase or neighbour from another project; no-op writes nothing; records `DELIVERABLE_UPDATED` with "moved deliverable … to phase …" / "reordered deliverable …" (`data-model.md › Existing models, new behaviour`). Run; fails.
- [x] T039 [P] [US4] Add a case to `apps/web/src/feature/projects/project/overview.test.tsx` (create if absent): a Manager sees `SortableHandle`s and a keyboard reorder calls `REORDER_PROJECT_PHASES` with the full id list; a Member sees no handle but the row menu still exists without move items. Run; fails.
- [x] T040 [P] [US4] Add an e2e case to `apps/api/test/workspace.e2e-spec.ts`: `moveProjectDeliverable` into another phase persists `phaseId` and contiguous `order`.

### Implementation for User Story 4

- [x] T041 [US4] Implement `DeliverablesService.move(input, actorId)` in `apps/api/src/feature/projects/deliverables.service.ts`, add `moveProjectDeliverable` to `apps/api/src/feature/projects/deliverables.resolver.ts` (+spec forwarding case), regenerate and commit `apps/api/schema.graphql`; make T038 and T040 pass.
- [x] T042 [US4] Add `MOVE_PROJECT_DELIVERABLE` to `apps/web/src/feature/projects/operations.ts`, run codegen; make the phase list in `apps/web/src/feature/projects/project/overview.tsx` a `SortableContext` with `SortableHandle` per row (Managers only) and `arrayMove` → `REORDER_PROJECT_PHASES`, keeping "Move up/down" in the row menu; make T039 pass.
- [x] T043 [US4] Make deliverables in `apps/web/src/feature/projects/project/readiness.tsx` sortable within a phase and droppable across phases (one `DndContext`, per-phase `SortableContext`), calling `MOVE_PROJECT_DELIVERABLE` with `phaseId` and neighbours, "Move to phase…" and "Move up/down" in the row menu, Members allowed; verify `quickstart.md` step 9.

**Checkpoint**: Every reorderable list drags, with menu equivalents.

---

## Phase 7: User Story 5 - Work in a project management shell (Priority: P3)

**Goal**: Compact header, Work and Pages navigation, task side panel with inline editing and per-task activity, remembered view and filters, project cards with sort and "my open tasks", quick-add shortcut.

**Independent Test**: `quickstart.md` steps 1, 10, 11, 12.

### Tests for User Story 5

- [x] T044 [P] [US5] Add cases to `apps/api/src/feature/projects/projects.service.spec.ts`: `listMine(userId, page, sort)` orders `RECENT` by `updatedAt desc` and `GO_LIVE` by `targetGoLiveDate asc` nulls last, and maps `myOpenTasks` from a filtered `_count`; `activity(projectId, page, targetId)` adds `targetId` to the where clause. Run; fails.
- [x] T045 [P] [US5] Write `apps/web/src/feature/projects/view-preferences.test.ts` (read/write round trip; unreadable storage returns the default `{ view: 'board', search: {} }`) and `apps/web/src/feature/projects/components/use-shortcut.test.tsx` (`n` fires on the document, not inside an input/textarea/select/contenteditable, not while an element with `role="dialog"` is open). Run; fails.
- [x] T046 [P] [US5] Add cases to `apps/web/src/feature/projects/components/TaskDetailSheet.test.tsx` (create if absent): every field renders as an inline editor that calls `UPDATE_PROJECT_TASK` on commit; the task's activity list queries `PROJECT_ACTIVITY` with `targetId`; the sheet is non-modal (the page behind keeps `aria-hidden` unset). Run; fails.
- [x] T047 [P] [US5] Add an e2e case to `apps/api/test/workspace.e2e-spec.ts`: `projects(sort: GO_LIVE)` orders by go-live and `myOpenTasks` counts only the caller's not-complete tasks; `projectActivity(targetId)` returns only that task's rows.

### Implementation for User Story 5

- [x] T048 [US5] Implement `sort` and `myOpenTasks` in `ProjectsService.listMine` and `targetId` in `ProjectsService.activity` in `apps/api/src/feature/projects/projects.service.ts`; add the args to `apps/api/src/feature/projects/projects.resolver.ts` (+spec); regenerate and commit `apps/api/schema.graphql`; make T044 and T047 pass.
- [x] T049 [US5] Update `PROJECT_LIST` (`$sort`, `myOpenTasks`) and `PROJECT_ACTIVITY` (`$targetId`) in `apps/web/src/feature/projects/operations.ts`; run codegen.
- [x] T050 [P] [US5] Implement `apps/web/src/feature/projects/view-preferences.ts` (`readViewPreference(projectId)`, `writeViewPreference(projectId, { view, search })`, key `baseline.project-view.<id>`, try/catch) and `apps/web/src/feature/projects/components/use-shortcut.ts`; make T045 pass.
- [x] T051 [P] [US5] Implement `apps/web/src/feature/projects/components/InlineField.tsx` (label + editor variants: text, textarea, select, person, date; commits on blur/Enter, Escape reverts) and rework `apps/web/src/feature/projects/components/TaskDetailSheet.tsx` to use it for title, description, phase, owner, status, priority, start, due, predecessor and department, add the per-task activity list, and make the `Sheet` non-modal (`modal={false}`); make T046 pass.
- [x] T052 [US5] Redesign `apps/web/src/feature/projects/project/layout.tsx`: compact header (name, hospital, `StatusBadge`, `Progress` with percent, overdue count, target go-live, Edit for Managers), the Work switcher and a Pages nav (Overview, Readiness, Org chart when present, Team, Stakeholders, Activity); remove the four summary cards; write the view preference whenever the view or search changes; keep `aria-current` on the active item.
- [x] T053 [P] [US5] Add `apps/web/src/routes/_protected/projects/$id/work.tsx` whose `beforeLoad` reads `readViewPreference(params.id)` and throws `redirect` to the remembered view with its search (default Board); make `apps/web/src/routes/_protected/projects/$id/index.tsx` stay Overview, and make the Projects list link to `/projects/$id/work`.
- [x] T054 [US5] Wire the `n` shortcut in `apps/web/src/feature/projects/project/board.tsx` (opens `TaskDialog`) and `apps/web/src/feature/projects/project/list.tsx` (focuses the first visible `QuickAddRow`); Escape dismisses.
- [x] T055 [P] [US5] Implement `apps/web/src/feature/projects/components/ProjectCard.tsx` (name, hospital, `StatusBadge`, `Progress`, go-live, overdue count, "N my open tasks", link to `/projects/$id/work`) and rework `apps/web/src/feature/projects/index.tsx` into a responsive card grid with a sort toggle (`RECENT` / `GO_LIVE`) and the existing "New project" dialog; add a render test `apps/web/src/feature/projects/index.test.tsx` with `MockedProvider`.
- [x] T056 [US5] Verify `quickstart.md` steps 1, 10, 11 and 12 on `baseline-dev`.

**Checkpoint**: The workspace reads as one product; all five stories complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T057 [P] Review every drag surface against `contracts/ui-interaction.md` and `.claude/skills/ui-design/SKILL.md`: focus rings on handles, `motion-safe:` transitions, `dropAnimation` null under reduced motion, touch at 375 px, live-region text; fix findings in `Board.tsx`, `TaskList.tsx`, `Gantt.tsx`, `overview.tsx`, `readiness.tsx`.
- [x] T058 [P] Load test locally: seed a project with 300 tasks through the e2e harness or a throwaway script in the scratchpad, open Board and List on `baseline-dev`, confirm open < 2 s and drag feedback < 100 ms (SC-006); memoise columns/groups if needed.
- [x] T059 [P] Update `README.md` (workspace views, drag and drop, keyboard map summary) and `specs/010-pm-workspace-redesign/quickstart.md` for any step that changed; no other planning docs.
- [x] T060 Run the full gate: `npm test -w apps/api`, `DATABASE_URL=… npm run test:e2e -w apps/api`, `npm run schema:check`, `npm run codegen -w apps/web && npm test -w apps/web -- --run`, `npm run typecheck && npm run lint && npm run build`; walk `quickstart.md` 1–12.
- [x] T061 Commit as `feat(010): project management workspace with drag and drop` including the migration, `apps/api/schema.graphql`, `package-lock.json` and `specs/010-pm-workspace-redesign/`; rebuild and redeploy `baseline` per `plan.md › Deployment Notes`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup → Foundational**: T003 → T004; T005, T006 parallel after T004; T007 → T008; T009 after T005; T010 after T008; T011 after T010; T012 after T010; T013–T017 parallel after T012 (T014 needs T013's `parseWorkSearch`; T016 needs T012's document).
- **US1 (Board)** needs all of Phase 2.
- **US2 (List)** needs Phase 2; independent of US1 except the shared `layout.tsx` switcher (T024 then T030 edit it sequentially).
- **US3 (Timeline)** needs Phase 2 (`predecessorConflict`, filters); independent of US1/US2.
- **US4 (Plan drags)** needs Phase 2 for `SortableHandle` and sensors; the API part (T038, T040, T041) needs only Phase 1.
- **US5 (Shell)** needs US1 and US2 for the view switcher targets and the `work.tsx` redirect; its API tasks (T044, T047, T048) need only Phase 1.
- **Polish** after the stories you ship.

### Files touched by several stories (edit sequentially)

- `apps/web/src/feature/projects/operations.ts`: T012, T042, T049.
- `apps/web/src/feature/projects/project/layout.tsx`: T024, T030, T052.
- `apps/web/src/feature/projects/lib.ts` / `lib.test.ts`: T013, T032/T035.
- `apps/api/test/workspace.e2e-spec.ts`: T011, T026, T034, T040, T047.
- `apps/api/schema.graphql`: regenerated in T010, T041, T048.

### Parallel Opportunities

- Phase 2: T005 + T006; T009 alongside T007/T008; T013, T015, T016, T017 together after T012.
- US1: T018 + T019; T023 alongside T020–T022.
- US2: T025 + T026; T027 + T030 together; then T028 → T029 → T031.
- US3: T032 + T033 + T034; then T035 → T036 → T037.
- US4: T038 + T039 + T040; T041 and T042 touch different apps and can run together after T038/T039.
- US5: T044–T047 together; T050, T051, T053, T055 together after T049.

## Parallel Example: User Story 1

```bash
# Tests first:
Task: "Board.test.tsx: columns, cards, keyboard move, no-op, menu, canEdit"   (T018)
Task: "board.test.tsx: failed move restores + toast, filters narrow"          (T019)

# Then:
Task: "BoardCard.tsx + BoardColumn.tsx"                                       (T020)
Task: "route board.tsx + breadcrumb"                                          (T023)
# Board.tsx (T021) after T020; board.tsx view (T022) after T021; switcher (T024) last.
```

## Implementation Strategy

### MVP First (Phases 1–3)

1. Setup and Foundational: position column, move mutation, drag toolkit, shared filters.
2. US1 Board. **Stop and validate** with `quickstart.md` 2–5. Deploy and demo: status changes by drag with keyboard and touch parity.

### Incremental Delivery

3. US2 List (quick-add, inline editing, cross-phase drag) and retire the table.
4. US3 Timeline interaction.
5. US4 Plan drags (phases, deliverables).
6. US5 Shell polish (header, side panel, remembered view, project cards, shortcut).
7. Polish, full gate, commit and deploy.

## Notes

- The only stored schema change is `ProjectTask.position`; every other behaviour is in services and views.
- Node runs in the dev container; run `npm` there and commit the lockfile after T001.
- When feature 009 is not yet merged, omit the department chip, filter and inline field; nothing else depends on it.
