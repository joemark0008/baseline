# Research: Project Org Chart

All decisions resolve the feature within the fixed stack (constitution › Technology Stack); no
new dependency is added. Decisions 1–4 shape the data model, 5–8 the API, 9–11 the web.

## Decision 1: Departments are a new aggregate inside the `projects` feature module

- **Decision**: Add `departments.service.ts` and `department-template.service.ts` (each with its
  resolver, DTOs and entity) to `apps/api/src/feature/projects/`, with the models in
  `projects.prisma`, instead of a separate `feature/org-chart` module.
- **Rationale**: A department is part of the project aggregate like phases, deliverables and
  stakeholders (007 precedent: one module, one single-purpose service per aggregate). The feature
  also touches tasks, deliverables, the composed project read and the activity kinds, which all
  live in this module; a second module would need to import the first and still edit it.
- **Alternatives considered**: `feature/org-chart` module importing `ProjectsModule` for
  `ProjectAccessService` (clean ownership, but the task/deliverable tag, the composed `project`
  read and the activity enum would still be edited in `projects`; two modules for one aggregate).

## Decision 2: Point person and alternate reference `ProjectStakeholder`; the database clears them

- **Decision**: `ProjectDepartment.pointPersonId` and `alternateId` are nullable foreign keys to
  `project_stakeholder` with `onDelete: SetNull`. "Is a participant" is derived in the composed
  read: the stakeholder's linked `userId` is in `project.members`.
- **Rationale**: FR-006 (point persons are stakeholder contacts), FR-010 (removing a contact
  unassigns automatically) and SC-006 are satisfied by the schema, not by service code that could
  be bypassed. No new person entity; the existing `StakeholderDialog` creates contacts.
- **Alternatives considered**: Free-text point person (no contact details, drifts from the
  directory); referencing `User` (excludes hospital staff without accounts, the common case).

## Decision 3: Tree with adjacency list, order per parent, case-insensitive unique name per project

- **Decision**: `parentId` self-relation (`onDelete: Restrict`; the service decides what happens
  to children), `order Int` unique within `(projectId, parentId)` by service rule, and a stored
  `nameKey` (trimmed, lower-cased name) with `@@unique([projectId, nameKey])`.
- **Rationale**: Charts are small (tens of rows), so the whole tree is read in one query and
  shaped in the service; no recursive SQL. Cycle prevention walks the parent chain (bounded, same
  approach as task predecessors). Prisma cannot declare a functional unique index, so `nameKey`
  gives the case-insensitive rule a real constraint.
- **Alternatives considered**: Materialised path or closure table (more code, no benefit at this
  size); `Cascade` on parent (would delete sub-departments silently, forbidden by FR-004).

## Decision 4: Suggested departments follow the template pattern; copied at project creation and seedable later

- **Decision**: `TemplateDepartment { name, order }`, flat, administrator-maintained
  (`projects:edit`) like `TemplatePhase`. `ProjectsService.create` copies it into the new project
  (inside its existing transaction). Projects that pre-date the feature show an empty chart with a
  one-click `seedProjectDepartments` mutation that copies the current list only when the chart is
  empty.
- **Rationale**: FR-005 and spec assumption (same template pattern as the lifecycle). A flat list
  keeps the admin editor as simple as template deliverables; hierarchy is a per-project decision.
  Seeding on view would be a mutation hidden in a query; an explicit button is honest and idempotent.
- **Alternatives considered**: Hierarchical template (two-level editor, little value for a starter
  list); a code constant (not editable, contradicts the spec); seeding existing projects in the
  migration (surprises running projects).
- **Initial seed** (12): Administration, Medical Records, Nursing, Pharmacy, Laboratory,
  Radiology, Billing and Cashier, Information Technology, Supply and Inventory, Emergency,
  Outpatient, Inpatient.

## Decision 5: The chart is a field of `Project`, not a separate query

- **Decision**: `Project.orgChart: ProjectOrgChart! { departments, unassignedCount }` composed in
  the same `project(id)` read; `ProjectStakeholder.isMember: Boolean!` is added to the existing
  type. Search and filter (FR-013) are client-side over the loaded list.
- **Rationale**: 007 reads one project in one composed query (no DataLoader); the chart is small.
  The web's `ProjectContext` already carries the project, so every tab (tasks, readiness) can show
  the point person without a second request.
- **Alternatives considered**: `projectOrgChart(projectId)` query (second round trip, second cache
  entry to keep consistent after mutations); server-side search (unneeded at this size).

## Decision 6: Tasks and deliverables carry `departmentId`; the web joins from the project

- **Decision**: `ProjectTask.departmentId: ID` and `ProjectDeliverable.departmentId: ID`
  (nullable, `SetNull` on department removal); create/update inputs accept `departmentId`, and the
  service checks it belongs to the same project. Open counts per department are computed in the
  composed read from the already-loaded tasks and deliverables.
- **Rationale**: Mirrors `phaseId` (the web already joins phases from the project). The point
  person is resolved at view time because both the tag and the chart come from the same fresh
  read (FR-015). No N+1, no copied names.
- **Alternatives considered**: Nested `department { pointPerson }` on each task (duplicates the
  chart in every task row); a separate counts query.

## Decision 7: One contact mutation with a slot enum; contact creation stays a separate step

- **Decision**: `setDepartmentContact(input: { departmentId, slot: POINT_PERSON | ALTERNATE,
stakeholderId: ID | null })`. Creating a new contact from the chart reuses the existing
  `addProjectStakeholder` mutation and `StakeholderDialog`, then assigns the returned id.
- **Rationale**: Two slots, one rule set (stakeholder must belong to the project; the same person
  cannot fill both slots of one department). Reusing the stakeholder mutation keeps one code path
  for contact validation. The two-step flow is not atomic, but the worst case is an unassigned
  contact in the directory, which the Manager sees immediately.
- **Alternatives considered**: Nested `newContact` input (duplicates stakeholder validation and
  the dialog); two mutations per slot (same code twice).

## Decision 8: Removal policy is an explicit argument

- **Decision**: `removeProjectDepartment(id, children: PROMOTE | REMOVE)`. `PROMOTE` moves direct
  children to the removed department's parent (appended in order); `REMOVE` deletes the subtree.
  Both run in one transaction, record one activity row naming the policy, and leave tagged tasks
  and deliverables untagged (`SetNull`).
- **Rationale**: FR-004 requires the Manager's choice; making it a required argument means the
  API cannot be called without one.

## Decision 9: Activity kinds extended, not generalised

- **Decision**: Add `DEPARTMENT_ADDED`, `DEPARTMENT_UPDATED`, `DEPARTMENT_REMOVED`,
  `DEPARTMENTS_REORDERED`, `DEPARTMENT_CONTACT_CHANGED` to `ProjectActivityKind` (Prisma enum,
  TypeScript union in `activity.ts`, GraphQL enum). Contact changes carry `{ slot, from, to }`
  in `details`.
- **Rationale**: 007 plan: activity kinds are an enum extended by adding values (OCP); the
  activity tab needs no change beyond labels.

## Decision 10: The chart renders as a collapsible nested tree, not a boxes-and-lines diagram

- **Decision**: `OrgChartTree` renders departments as nested rows (indent per level, expand and
  collapse, connector line via a left border) with the point person, alternate, participant
  badge, open-work count and an "Unassigned" badge; a search box filters by department or person
  name and keeps matching ancestors visible. Built from shadcn primitives (`Card`, `Badge`,
  `Button`, `Input`, `Collapsible`, `DropdownMenu`) per the `ui-design` skill.
- **Rationale**: Readable at 375 px and at 50+ departments four levels deep (spec edge case), no
  layout library, keyboard and screen-reader friendly (a `tree` role with `aria-level`). A
  horizontal boxes-and-lines chart needs panning at phone width and a layout engine.
- **Alternatives considered**: SVG box diagram (new layout code, poor on small screens; can be
  added later as a second view); a flat table with a "parent" column (hides the hierarchy).

## Decision 11: Tree shaping and filtering are pure functions in `lib.ts`

- **Decision**: `buildDepartmentTree(departments)` and `filterDepartmentTree(tree, query)` live
  in `apps/web/src/feature/projects/lib.ts` with Vitest unit tests; components only render.
- **Rationale**: Constitution IV/V for React: components take narrow props; logic is testable
  without rendering.
