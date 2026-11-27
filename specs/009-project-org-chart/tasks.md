---
description: 'Executable tasks for the project org chart (feature 009)'
---

# Tasks: Project Org Chart

**Input**: Design documents from `/specs/009-project-org-chart/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/graphql.md`, `quickstart.md`

**Tests**: Included. The constitution makes unit tests mandatory for every behaviour change and
feature 007 followed red-green per story; the same applies here. Write each story's tests first,
run them to see them fail, then implement.

**Organization**: Tasks are grouped by user story so each story is an independently testable
increment. Field constraints are cited as `data-model.md › Entity.field` and are not restated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on an unfinished task).
- Story labels map to the user stories in `spec.md` (US1 find, US2 build, US3 alternate, US4 work tag).
- Paths are repository-relative. API code lives in `apps/api/src/feature/projects/`, web code in `apps/web/src/feature/projects/`.

## Path Conventions

- Scaffold new Nest classes with `npm run g -w apps/api -- <schematic> feature/projects/<name>` (keeps the generated `*.spec.ts`), then move the files into the flat module layout the module already uses.
- After any resolver or entity change: `npm run schema:generate` and commit `apps/api/schema.graphql`; after any `operations.ts` change: `npm run codegen -w apps/web`.
- UI follows `.claude/skills/ui-design/SKILL.md`; primitives come from `apps/web/src/components/ui/` (all needed ones exist: card, badge, button, input, select, textarea, collapsible, dropdown-menu, dialog, alert-dialog, sheet).

---

## Phase 1: Setup

**Purpose**: Confirm the workspace and the existing feature 007 baseline before touching the schema.

- [ ] T001 Run `npm ci` at the repository root and confirm `npm test -w apps/api` and `npm test -w apps/web -- --run` pass on the current `main` so later failures are attributable to this feature.
- [ ] T002 [P] Confirm `DATABASE_URL` in the root `.env` points at the `baseline_dev` database and that `npm run test:e2e -w apps/api` can boot (`apps/api/test/projects.e2e-spec.ts` passes); the new e2e spec in T012 uses the same harness.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, migration, enums, entities and the composed project read that every story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Add `TemplateDepartment` and `ProjectDepartment` models, the `departments`, `pointPersonOf` and `alternateOf` back-relations, `ProjectTask.departmentId` and `ProjectDeliverable.departmentId`, and the five new `ProjectActivityKind` values to `apps/api/prisma/schema/projects.prisma` exactly as `data-model.md › TemplateDepartment.*`, `ProjectDepartment.*` (incl. `nameKey`, `@@unique([projectId, nameKey])`, `@@index([projectId, parentId, order])`, `parentId` Restrict, `pointPersonId`/`alternateId`/`templateDepartmentId` SetNull) and `ProjectTask.departmentId` / `ProjectDeliverable.departmentId` (SetNull) specify.
- [ ] T004 Create the migration `apps/api/prisma/migrations/<timestamp>_add_org_chart/migration.sql` with `npx prisma migrate dev --create-only -n add_org_chart` (run in `apps/api`), then append the 12-row `template_department` seed from `research.md › Decision 4` with ids `tdp_<slug>` and orders 1–12; apply it with `npx prisma migrate dev` and regenerate the client.
- [ ] T005 [P] Extend the `ProjectActivityKind` union in `apps/api/src/feature/projects/activity.ts` with `DEPARTMENT_ADDED`, `DEPARTMENT_UPDATED`, `DEPARTMENT_REMOVED`, `DEPARTMENTS_REORDERED`, `DEPARTMENT_CONTACT_CHANGED`.
- [ ] T006 [P] Add the same five values to the `ProjectActivityKind` enum and register the new GraphQL enums `DepartmentContactSlot { POINT_PERSON, ALTERNATE }` and `DepartmentChildPolicy { PROMOTE, REMOVE }` in `apps/api/src/feature/projects/entities/enums.ts` (`data-model.md › Enums`).
- [ ] T007 [P] Create `apps/api/src/feature/projects/entities/department.entity.ts` with `@ObjectType()` classes `ProjectDepartment` and `ProjectOrgChart` per `contracts/graphql.md › Types` (`pointPerson`/`alternate` typed as the existing `ProjectStakeholder`), and add `TemplateDepartment { id, name, order }` to `apps/api/src/feature/projects/entities/template.entity.ts`.
- [ ] T008 Add `orgChart: ProjectOrgChart!` to `Project`, `isMember: Boolean!` to `ProjectStakeholder`, and nullable `departmentId: ID` to `ProjectTask` and `ProjectDeliverable` in `apps/api/src/feature/projects/entities/project.entity.ts` (depends on T007).
- [ ] T009 Extend `apps/api/src/feature/projects/mappers.ts`: add `departments` (ordered by `parentId` nulls first, then `order`, including `pointPerson { user }` and `alternate { user }`) to `PROJECT_INCLUDE`; make `toProject` compute `ProjectStakeholder.isMember`, `ProjectDepartment.openTaskCount`, `openDeliverableCount` and `ProjectOrgChart.unassignedCount` as defined in `data-model.md › Derived values`; pass `departmentId` through `toTask` and `toDeliverable`. Add a unit test for the derived values to `apps/api/src/feature/projects/mappers.spec.ts` (create the file; fixture rows only, no I/O).
- [ ] T010 Create `apps/api/src/feature/projects/dto/department.input.ts` with `AddDepartmentInput`, `UpdateDepartmentInput` and `DepartmentContactInput` per `contracts/graphql.md › Types`, validating `ProjectDepartment.name` and `ProjectDepartment.description` lengths with `class-validator` as `data-model.md › ProjectDepartment.name` / `ProjectDepartment.description` specify, and `slot` as `DepartmentContactSlot`.
- [ ] T011 Run `npm run schema:generate` and `npm run codegen -w apps/web`; extend the `PROJECT` document in `apps/web/src/feature/projects/operations.ts` with `orgChart { unassignedCount departments { id name description parentId order openTaskCount openDeliverableCount templateDepartmentId pointPerson { id name organization role email phone isMember user { id name email image } } alternate { …same } } }`, `stakeholders { … isMember }`, and `departmentId` on tasks and deliverables; add `DepartmentData = ProjectData['orgChart']['departments'][number]` and the activity `LABELS` for the five new kinds to `apps/web/src/feature/projects/lib.ts`; confirm `npm run typecheck` passes for both apps.
- [ ] T012 Create the e2e harness `apps/api/test/org-chart.e2e-spec.ts` by copying the `describeWithDb`, `gql` and `personIn` helpers from `apps/api/test/projects.e2e-spec.ts`, creating one project as an admin Manager plus one Member and one non-member in `beforeAll`, and cleaning up in `afterAll`. Leave the `it` blocks to the story phases.

**Checkpoint**: schema migrated, `project(id)` returns `orgChart { departments: [], unassignedCount: 0 }` for an existing project, both apps type-check.

---

## Phase 3: User Story 2 - Build and maintain the org chart (Priority: P1) 🎯 MVP

**Goal**: A Manager adds, renames, re-parents, reorders and removes departments, assigns a point person from the stakeholder directory (creating a contact inline), and new projects start from the suggested list. Every change is recorded in activity.

**Why first**: US1 (finding a point person) is the spec's primary value, but it has nothing to show until a chart exists; US2 delivers the data and the Manager UI that US1 reads. Together they are the MVP.

**Independent Test**: As a Manager, create five departments including one nested under another, assign point persons to four, reload: structure and assignments persist, the fifth is unassigned. Cycle, duplicate-name and removal-policy rules behave as `quickstart.md` steps 1, 2, 3, 7, 10, 12 describe.

### Tests for User Story 2

- [ ] T013 [P] [US2] Write `apps/api/src/feature/projects/department-template.service.spec.ts` (fake `PrismaService` via `useValue`): `list` ordered; `add` trims and rejects a case-insensitive duplicate; `reorder` rejects ids that do not list every row exactly once; `copyInto(tx, projectId)` creates one `projectDepartment` per template row with `order` 1..n, `nameKey` lower-cased and `templateDepartmentId` set. Run it; it fails.
- [ ] T014 [P] [US2] Write `apps/api/src/feature/projects/departments.service.spec.ts` (fake `PrismaService` and `ProjectAccessService`): Member calling `add` is rejected with `MANAGER_ONLY`; duplicate `nameKey` → "A department with this name already exists"; `update` moving a department under its own descendant → "A department cannot be moved under one of its own sub-departments"; parent from another project → not found; `reorder` must list every sibling once; `remove` with `PROMOTE` re-parents children to the removed node's parent and appends their order, with `REMOVE` deletes the subtree depth-first; `setContact` rejects a stakeholder from another project and the same stakeholder in both slots ("Already the point person" / "Already the alternate"), and `null` clears; `seed` refused when departments exist ("The org chart already has departments"); every mutation calls `recordActivity` once with the kind from `data-model.md › Activity rows`. Run it; it fails.
- [ ] T015 [P] [US2] Write `apps/api/src/feature/projects/departments.resolver.spec.ts` and `apps/api/src/feature/projects/department-template.resolver.spec.ts` asserting each resolver method forwards arguments and the session user id to the service and contains no rules. Run them; they fail.
- [ ] T016 [P] [US2] Add e2e cases to `apps/api/test/org-chart.e2e-spec.ts`: a project created via `createProject` has 12 departments and `unassignedCount: 12`; add/update/reorder/remove persist across a fresh `project(id)` read; the cycle and duplicate rules return `BAD_USER_INPUT`; `removeProjectDepartment(…, PROMOTE)` keeps children, `REMOVE` deletes them; Member gets `FORBIDDEN` on `addProjectDepartment`; non-member gets `NOT_FOUND` on `project(id)`; `seedProjectDepartments` on a non-empty chart returns `BAD_USER_INPUT`; a template rename does not change an existing project's department. Run; they fail.
- [ ] T017 [P] [US2] Write `apps/web/src/feature/projects/lib.test.ts` cases for `buildDepartmentTree` (roots first, children ordered by `order`, orphaned `parentId` treated as root) and `filterDepartmentTree` (matches department name or point person/alternate name case-insensitively, keeps ancestors of a match, empty query returns everything). Run; they fail.
- [ ] T018 [P] [US2] Write `apps/web/src/feature/projects/components/OrgChartTree.test.tsx`: renders nested rows with `role="tree"`/`treeitem` and `aria-level`, shows the "Unassigned" badge when `pointPerson` is null, hides the actions menu when `canManage` is false, calls `onAssign`, `onEdit`, `onRemove` with the department. Run; it fails.

### Implementation for User Story 2

- [ ] T019 [US2] Implement `apps/api/src/feature/projects/department-template.service.ts` (`DepartmentTemplateService`: `list`, `add`, `update`, `reorder` with the two-pass renumbering used by `TemplateService`, `remove`, and `copyInto(tx, projectId)`) enforcing `data-model.md › TemplateDepartment.name`, `TemplateDepartment.order` and the case-insensitive uniqueness rule; make T013 pass.
- [ ] T020 [US2] Implement `apps/api/src/feature/projects/departments.service.ts` (`DepartmentsService`: `add`, `update`, `reorder`, `remove(id, policy)`, `setContact`, `seed`) with every rule under `data-model.md › Project departments › Rules`, `nameKey` derived from the trimmed lower-cased name (`ProjectDepartment.nameKey`), bounded ancestor walk for cycles, contiguous `ProjectDepartment.order` per parent, one `$transaction` plus one `recordActivity` per mutation with the summaries from `data-model.md › Activity rows`; make T014 pass.
- [ ] T021 [P] [US2] Implement `apps/api/src/feature/projects/departments.resolver.ts` with the six Manager mutations from `contracts/graphql.md › Mutations` (`addProjectDepartment`, `updateProjectDepartment`, `reorderProjectDepartments`, `removeProjectDepartment`, `setDepartmentContact`, `seedProjectDepartments`), each `@RequirePermission('projects', 'view')` and passing the session user id to the service; make T015 pass.
- [ ] T022 [P] [US2] Implement `apps/api/src/feature/projects/department-template.resolver.ts` with `departmentTemplate` (`projects:view`) and `addTemplateDepartment`, `updateTemplateDepartment`, `reorderTemplateDepartments`, `removeTemplateDepartment` (`projects:edit`) per `contracts/graphql.md`; make T015 pass.
- [ ] T023 [US2] Register the two services and two resolvers in `apps/api/src/feature/projects/projects.module.ts`; inject `DepartmentTemplateService` into `ProjectsService` in `apps/api/src/feature/projects/projects.service.ts` and call `copyInto(tx, project.id)` inside the `create` transaction; update `apps/api/src/feature/projects/projects.service.spec.ts` so `create` asserts the copy is called with the transaction and new project id. Run `npm run schema:generate`, commit `apps/api/schema.graphql`, and make T016 pass with `npm run test:e2e -w apps/api`.
- [ ] T024 [US2] Add the documents `ADD_PROJECT_DEPARTMENT`, `UPDATE_PROJECT_DEPARTMENT`, `REORDER_PROJECT_DEPARTMENTS`, `REMOVE_PROJECT_DEPARTMENT`, `SET_DEPARTMENT_CONTACT`, `SEED_PROJECT_DEPARTMENTS`, `DEPARTMENT_TEMPLATE`, `ADD_TEMPLATE_DEPARTMENT`, `UPDATE_TEMPLATE_DEPARTMENT`, `REORDER_TEMPLATE_DEPARTMENTS`, `REMOVE_TEMPLATE_DEPARTMENT` to `apps/web/src/feature/projects/operations.ts` (`contracts/graphql.md › Web documents`) and run `npm run codegen -w apps/web`.
- [ ] T025 [P] [US2] Implement `buildDepartmentTree` and `filterDepartmentTree` as pure functions (plus a `DepartmentNode` type with `children`) in `apps/web/src/feature/projects/lib.ts`; make T017 pass.
- [ ] T026 [US2] Implement `apps/web/src/feature/projects/components/OrgChartTree.tsx`: props `{ nodes: DepartmentNode[], canManage: boolean, onAssign, onEdit, onRemove, onMove(id, direction) }`; nested `Collapsible` rows with indent per level and a left connector border, department name and description, point person line (name · role · email/phone links, "Participant" `Badge` when `isMember`), alternate line, "Unassigned" destructive `Badge` when `pointPerson` is null, open-work count, and a `DropdownMenu` (Assign point person, Assign alternate, Edit, Move up/down, Remove) shown only when `canManage`; make T018 pass.
- [ ] T027 [P] [US2] Implement `apps/web/src/feature/projects/components/DepartmentDialog.tsx` (add/edit: name `Input`, description `Textarea`, parent `Select` listing every other department of the project except the node's own descendants with a "Top level" option) using `ADD_PROJECT_DEPARTMENT` / `UPDATE_PROJECT_DEPARTMENT`, `refetchQueries: [PROJECT]`, server error shown inline, `toast.success` on save.
- [ ] T028 [P] [US2] Implement `apps/web/src/feature/projects/components/DepartmentContactDialog.tsx`: props `{ projectId, department, slot, stakeholders, onOpenChange }`; a `Select` of project stakeholders ("name · organization") plus a "New contact…" item that opens the existing `StakeholderDialog` and, on its success, assigns the created id; "Clear" button when the slot is filled; calls `SET_DEPARTMENT_CONTACT` with `refetchQueries: [PROJECT]`. Extend `apps/web/src/feature/projects/components/StakeholderDialog.tsx` with an optional `onCreated(stakeholder)` callback (no change to existing callers).
- [ ] T029 [P] [US2] Implement `apps/web/src/feature/projects/components/RemoveDepartmentDialog.tsx` on `AlertDialog`: when the department has children, offer "Keep sub-departments" (`PROMOTE`) and "Remove them too" (`REMOVE`), otherwise a plain confirm; calls `REMOVE_PROJECT_DEPARTMENT` with the chosen `DepartmentChildPolicy`.
- [ ] T030 [US2] Implement the tab `apps/web/src/feature/projects/project/org-chart.tsx` (`ProjectOrgChartTab`): `Card` header "Org chart" with the unassigned count, "Add department" button (Managers), search `Input` driving `filterDepartmentTree`, the `OrgChartTree`, and an empty state that offers "Start from the suggested list" (`SEED_PROJECT_DEPARTMENTS`, Managers) or "Add department"; wire the three dialogs and `REORDER_PROJECT_DEPARTMENTS` for move up/down among siblings (depends on T025–T029).
- [ ] T031 [P] [US2] Add the one-line route `apps/web/src/routes/_protected/projects/$id/org-chart.tsx` (`createFileRoute('/_protected/projects/$id/org-chart')` → `ProjectOrgChartTab`), add `{ label: 'Org chart', to: '/projects/$id/org-chart' }` after Stakeholders in `TABS` of `apps/web/src/feature/projects/project/layout.tsx`, and the breadcrumb pattern `/^\/projects\/[^/]+\/org-chart$/` → "Org chart" in `apps/web/src/lib/navigation.ts`.
- [ ] T032 [P] [US2] Implement `apps/web/src/feature/settings/template/SuggestedDepartments.tsx` (list from `DEPARTMENT_TEMPLATE`; inline add, rename, move up/down via `REORDER_TEMPLATE_DEPARTMENTS`, remove with `ConfirmDialog`) and render it below the phase editor in `apps/web/src/feature/settings/template/index.tsx`; add a render test `apps/web/src/feature/settings/template/SuggestedDepartments.test.tsx` with `MockedProvider` covering the list and the add flow.

**Checkpoint**: `quickstart.md` steps 1, 2, 3, 7, 10, 11 and 12 pass on `baseline-dev`; `npm test -w apps/api`, `npm run test:e2e -w apps/api`, `npm test -w apps/web -- --run` and `npm run schema:check` are green.

---

## Phase 4: User Story 1 - Find the point person for a department (Priority: P1)

**Goal**: Any participant opens the Org chart tab, finds a department by name or person, and sees the point person's name, role, contact details and whether they are a participant; unassigned departments are obvious; non-members are denied.

**Independent Test**: With a chart of at least three departments, a Member searches "blood", sees only Blood Bank with its ancestors, reads the point person's email and phone, sees a "Participant" badge on a linked stakeholder, and can open the stakeholder record. A non-member gets "Not found" (`quickstart.md` steps 4, 6, 11).

### Tests for User Story 1

- [ ] T033 [P] [US1] Add e2e cases to `apps/api/test/org-chart.e2e-spec.ts`: a Member's `project(id)` read returns `orgChart.departments[].pointPerson { name role email phone isMember }` with `isMember: true` only when the stakeholder's `userId` is a project member; `unassignedCount` ignores alternates; a non-member reading `project(id)` gets `NOT_FOUND`. Run; the `isMember` case fails until T009 is wired for linked users (verify) and the rest pass.
- [ ] T034 [P] [US1] Extend `apps/web/src/feature/projects/components/OrgChartTree.test.tsx`: contact details render as `mailto:` and `tel:` links, "Contact details not recorded" appears when both are missing, and the "View contact" action is present for every viewer (not only Managers). Run; it fails.
- [ ] T035 [P] [US1] Add a render test `apps/web/src/feature/projects/project/org-chart.test.tsx` (wrap in `ProjectContext` with a fixture project): typing in the search box narrows the tree and keeps ancestors; the header shows "N unassigned"; with `can.manage = false` no add, assign or remove controls are rendered. Run; it fails.

### Implementation for User Story 1

- [ ] T036 [US1] In `apps/web/src/feature/projects/components/OrgChartTree.tsx` render `mailto:`/`tel:` links, the "Contact details not recorded" muted text, and a "View contact" `DropdownMenuItem` available to every viewer that calls a new `onView(stakeholder)` prop; make T034 pass.
- [ ] T037 [US1] In `apps/web/src/feature/projects/project/org-chart.tsx` show the stakeholder record in a read-only `Sheet` (`apps/web/src/feature/projects/components/StakeholderSheet.tsx`, new: name, organization, role, email, phone, notes, participant badge, and the departments the person covers) when `onView` fires; add a `Badge` summary "N unassigned" in the header driven by `orgChart.unassignedCount`; make T035 pass.
- [ ] T038 [P] [US1] Add a "Point persons" count card or line to the project Overview in `apps/web/src/feature/projects/project/overview.tsx` linking to the Org chart tab with "N of M departments assigned" (data already in `project.orgChart`).

**Checkpoint**: `quickstart.md` steps 4, 6 and 11 pass; all web and API tests green.

---

## Phase 5: User Story 3 - Record an alternate contact per department (Priority: P2)

**Goal**: A Manager records an alternate contact per department; the chart shows both with the point person marked primary, and a department with only an alternate is still unassigned.

**Independent Test**: Assign a point person and an alternate to Pharmacy, see both with "Primary" on the point person; clear the point person and the department shows "Unassigned" while the alternate remains (`quickstart.md` step 5).

### Tests for User Story 3

- [ ] T039 [P] [US3] Add cases to `apps/api/src/feature/projects/departments.service.spec.ts`: `setContact` with slot `ALTERNATE` writes `alternateId`, records `DEPARTMENT_CONTACT_CHANGED` with `details.slot = 'ALTERNATE'`, and clearing the point person leaves `alternateId` untouched. Run; they fail only if T020 skipped the alternate path (verify).
- [ ] T040 [P] [US3] Add an e2e case to `apps/api/test/org-chart.e2e-spec.ts`: after `setDepartmentContact(ALTERNATE)` then clearing `POINT_PERSON`, `unassignedCount` counts the department and `alternate` is still returned.
- [ ] T041 [P] [US3] Extend `apps/web/src/feature/projects/components/OrgChartTree.test.tsx`: both contacts render, the point person row carries "Primary", the alternate row carries "Alternate", and "Unassigned" still shows when only an alternate exists. Run; it fails.

### Implementation for User Story 3

- [ ] T042 [US3] Complete the alternate slot in `apps/api/src/feature/projects/departments.service.ts` (`ProjectDepartment.alternateId` per `data-model.md`, both-slots rule, activity details `{ slot, from, to }`); make T039 and T040 pass.
- [ ] T043 [US3] Render the alternate line with "Primary"/"Alternate" `Badge`s in `apps/web/src/feature/projects/components/OrgChartTree.tsx` and add the "Assign alternate" / "Clear alternate" menu items wired to `DepartmentContactDialog` with `slot: 'ALTERNATE'` in `apps/web/src/feature/projects/project/org-chart.tsx`; make T041 pass.

**Checkpoint**: `quickstart.md` step 5 passes.

---

## Phase 6: User Story 4 - See the point person from project work (Priority: P3)

**Goal**: Tasks and deliverables can be tagged with a department; the task detail shows the department's current point person; the chart shows open-work counts per department.

**Independent Test**: Tag a task with Pharmacy, open it, see "Pharmacy · point person <name> · <email>"; change Pharmacy's point person and the task shows the new person; Pharmacy's card shows "1 open task" (`quickstart.md` step 9).

### Tests for User Story 4

- [ ] T044 [P] [US4] Add cases to `apps/api/src/feature/projects/tasks.service.spec.ts` and `apps/api/src/feature/projects/deliverables.service.spec.ts`: `departmentId` from another project → "Department not found in this project"; a valid id is persisted; `null` clears. Run; they fail.
- [ ] T045 [P] [US4] Add e2e cases to `apps/api/test/org-chart.e2e-spec.ts`: `createProjectTask` with `departmentId` persists; the department's `openTaskCount` is 1 and drops to 0 when the task is `COMPLETE`; `removeProjectDepartment(REMOVE)` leaves the task with `departmentId: null`; a deliverable with a department contributes to `openDeliverableCount` until `READY`. Run; they fail.
- [ ] T046 [P] [US4] Add a render test to `apps/web/src/feature/projects/components/TaskDetailSheet.test.tsx` (create if absent, fixture via `ProjectContext`): a task with `departmentId` shows the department name and the point person's name and email; a department without a point person shows "No point person yet". Run; it fails.

### Implementation for User Story 4

- [ ] T047 [P] [US4] Add optional `departmentId` to `CreateTaskInput`/`UpdateTaskInput` in `apps/api/src/feature/projects/dto/task.input.ts` and to `AddDeliverableInput`/`UpdateDeliverableInput` in `apps/api/src/feature/projects/dto/deliverable.input.ts` (`ProjectTask.departmentId`, `ProjectDeliverable.departmentId` in `data-model.md`).
- [ ] T048 [US4] Validate and persist `departmentId` in `apps/api/src/feature/projects/tasks.service.ts` and `apps/api/src/feature/projects/deliverables.service.ts` (same-project check from `data-model.md › Task and deliverable tag`); include the field in their activity summaries when it changes; run `npm run schema:generate`; make T044 and T045 pass.
- [ ] T049 [US4] Add `departmentId` to the `CREATE_PROJECT_TASK`, `UPDATE_PROJECT_TASK`, `ADD_PROJECT_DELIVERABLE` and `UPDATE_PROJECT_DELIVERABLE` variables/selections and to `PROJECT_TASK` in `apps/web/src/feature/projects/operations.ts`; run codegen.
- [ ] T050 [P] [US4] Create `apps/web/src/feature/projects/components/DepartmentSelect.tsx` (props `{ departments, value, onChange }`, `Select` with "No department" and names indented by depth using `buildDepartmentTree`) and use it in `apps/web/src/feature/projects/components/TaskDialog.tsx` and `apps/web/src/feature/projects/components/DeliverableDialog.tsx`.
- [ ] T051 [US4] Show the department and its current point person (name, email link; "No point person yet" fallback) in `apps/web/src/feature/projects/components/TaskDetailSheet.tsx`, looked up from `project.orgChart.departments` by `departmentId`; make T046 pass.
- [ ] T052 [P] [US4] Add a department `Badge` to task rows in `apps/web/src/feature/projects/project/tasks.tsx` and deliverable rows in `apps/web/src/feature/projects/project/readiness.tsx`, and render `openTaskCount`/`openDeliverableCount` ("1 open task · 2 open deliverables") on each department in `apps/web/src/feature/projects/components/OrgChartTree.tsx`.

**Checkpoint**: `quickstart.md` step 9 passes; all four stories work independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T053 [P] Add e2e coverage for automatic unassignment to `apps/api/test/org-chart.e2e-spec.ts`: `removeProjectStakeholder` on a point person leaves `pointPerson: null` and raises `unassignedCount` (`quickstart.md` step 8, FR-010, SC-006).
- [ ] T054 [P] Add the five new activity kinds to the labels/wording in `apps/web/src/feature/projects/project/activity.tsx` if it maps kinds to icons or text (verify; `LABELS` in `lib.ts` was done in T011).
- [ ] T055 [P] Review every new screen against `.claude/skills/ui-design/SKILL.md` (page anatomy, loading/empty/error states, 375 px layout, keyboard navigation of the tree, `aria-current`, focus return after dialogs) and fix findings in the `org-chart.tsx`, `OrgChartTree.tsx` and dialog files.
- [ ] T056 Update `README.md` (project features list) and `specs/009-project-org-chart/quickstart.md` if any step changed during implementation; do not add other planning docs.
- [ ] T057 Run the full gate: `npm test -w apps/api`, `DATABASE_URL=… npm run test:e2e -w apps/api`, `npm run schema:check`, `npm run codegen -w apps/web && npm test -w apps/web -- --run`, `npm run typecheck && npm run lint && npm run build`; then walk `quickstart.md` steps 1–12 on `baseline-dev`.
- [ ] T058 Commit as `feat(009): project org chart with department point persons` including the migration, `apps/api/schema.graphql`, and the `specs/009-project-org-chart/` artifacts; rebuild and redeploy `baseline` per `plan.md › Deployment Notes`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)**: T003 → T004 (migration needs the schema); T005, T006, T007 in parallel after T004; T008 after T007; T009 after T006–T008; T010 after T006; T011 after T008–T010; T012 after T004.
- **US2 (Phase 3)** depends on Phase 2 and is the MVP data layer every other story reads.
- **US1 (Phase 4)** depends on US2 (needs a chart to search). It is the spec's P1 value; US2 is sequenced first only because it produces the data.
- **US3 (Phase 5)** depends on US2 (contact dialog and slot enum exist).
- **US4 (Phase 6)** depends on Phase 2 only for the API tasks (T044, T045, T047, T048) and on US2 for the web tasks (`DepartmentSelect` uses `buildDepartmentTree`).
- **Polish (Phase 7)** after the stories you ship.

### Within Each Story

- Tests first (fail) → service → resolver → schema generate → operations/codegen → components → tab/route.
- `operations.ts` is edited in T011, T024 and T049; do those sequentially, never in parallel.
- `OrgChartTree.tsx` is touched in T026, T036, T043, T052: finish each story's edit before the next.

### Parallel Opportunities

- Phase 2: T005, T006, T007 together; then T009 and T010 together.
- US2 tests T013–T018 all at once; then T019 and T020 together; T021 and T022 together; T025, T027, T028, T029, T031, T032 together once T024 is in.
- US1 tests T033–T035 together; T038 alongside T036/T037.
- US4: T044–T046 together; T047 with T050; T052 alongside T051.

## Parallel Example: User Story 2

```bash
# Tests first, all independent files:
Task: "Write department-template.service.spec.ts"      (T013)
Task: "Write departments.service.spec.ts"              (T014)
Task: "Write the two resolver specs"                   (T015)
Task: "Add US2 e2e cases to org-chart.e2e-spec.ts"     (T016)
Task: "Write lib.test.ts tree/filter cases"            (T017)
Task: "Write OrgChartTree.test.tsx"                    (T018)

# Then the web components, after T024 (operations + codegen):
Task: "lib.ts tree functions"                          (T025)
Task: "DepartmentDialog.tsx"                           (T027)
Task: "DepartmentContactDialog.tsx + StakeholderDialog onCreated" (T028)
Task: "RemoveDepartmentDialog.tsx"                     (T029)
Task: "route + tab + breadcrumb"                       (T031)
Task: "SuggestedDepartments admin section"             (T032)
```

## Implementation Strategy

### MVP First (Phases 1–3, then 4)

1. Phase 1 + Phase 2: schema, migration, entities, composed read (chart reads as empty).
2. Phase 3 (US2): Managers can build the chart; new projects are seeded. **Stop and validate** with `quickstart.md` 1–3, 7, 10–12.
3. Phase 4 (US1): search, contact links, participant badge, stakeholder sheet. This completes the MVP the spec calls P1; deploy and demo.

### Incremental Delivery

4. Phase 5 (US3): alternates. Small; ship when ready.
5. Phase 6 (US4): department tag on tasks and deliverables, open-work counts.
6. Phase 7: polish, full gate, commit and deploy.

## Notes

- Every mutation records activity in the same transaction; the activity tab needs only the new labels.
- The two stable-code edits (`ProjectsService.create`, `mappers.ts`) are covered by T009 and T023 tests, as the plan's constitution check requires.
- Do not add a `command`/combobox primitive; the stakeholder picker uses the existing `Select`.
