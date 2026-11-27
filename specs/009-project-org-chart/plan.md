# Implementation Plan: Project Org Chart

**Branch**: `009-project-org-chart` | **Date**: 2026-11-27 | **Spec**: `specs/009-project-org-chart/spec.md`

**Input**: Feature specification from `/specs/009-project-org-chart/spec.md`

## Summary

Every implementation project gets an org chart: a tree of departments, each with one point
person and an optional alternate drawn from the project's existing stakeholder directory, an
"unassigned" flag and count, search, and a department tag on tasks and deliverables that shows
the current point person. New projects start from an administrator-maintained suggested
department list (same pattern as the lifecycle template); older projects seed it with one click.
Delivered as two services, two resolvers, DTOs and entities added to the existing
`feature/projects` module, one Prisma migration, a new **Org chart** project tab, department
fields in the task and deliverable dialogs, and a "Suggested departments" section on the admin
template page. Decisions are recorded in `research.md`.

## Technical Context

**Language/Version**: TypeScript 6 on Node.js 22; NestJS 12, React 19

**Primary Dependencies**: Existing stack only: Prisma 7, code-first GraphQL (Apollo 4), Better Auth, Vite 8, TanStack Router, shadcn/ui (every needed primitive, including `collapsible` and `select`, is already in `src/components/ui`), Vitest, React Testing Library. No new packages.

**Storage**: PostgreSQL 16 (shared instance). Two new tables (`template_department`, `project_department`), two nullable columns (`project_task.departmentId`, `project_deliverable.departmentId`), five new `ProjectActivityKind` values, a 12-row seed. See `data-model.md`.

**Testing**: Unit specs beside the services (fake `PrismaService` via `useValue`), resolver specs, `apps/api/test/org-chart.e2e-spec.ts` against `DATABASE_URL`, web unit tests for tree shaping and filtering (`lib.test.ts`) and for `OrgChartTree` rendering.

**Target Platform**: The two existing containers; no new env vars.

**Project Type**: Web application (api + web)

**Performance Goals**: The composed `project(id)` read, now including the chart, stays under 300 ms for 100 tasks and 50 departments; the Org chart tab renders 50 departments four levels deep without jank and filters as the user types (pure in-memory functions).

**Constraints**: Non-members get `NotFound` (no existence leak); every change writes an activity row in the same transaction; a department can never reference a stakeholder outside its project or form a cycle; removing a contact or a department never leaves dangling references (database `SetNull`); no patient data fields.

**Scale/Scope**: Tens of departments per project, depth rarely beyond four; the chart is read whole and shaped in memory. Six project mutations, four template mutations, one template query, one new tab, three dialogs.

## Constitution Check

- **I. Single Responsibility**: `DepartmentsService` owns the project department tree and its contact slots; `DepartmentTemplateService` owns the suggested list and its copy into a project; `TasksService`/`DeliverablesService` gain only the "department belongs to this project" check on their own inputs; resolvers map arguments and session identity to service calls. Tree shaping and filtering on the web are pure functions in `lib.ts`; components render props.
- **II. Open/Closed**: New activity kinds are added enum values; the new tab is a new route and component; the template page gains a new section component rather than edits to the phase editor; contact slots and child policies are enums whose rules live in one place in the service. The two edits to stable code (`ProjectsService.create` copying the suggested list, `PROJECT_INCLUDE`/`toProject` composing the chart) introduce the extension and are covered by the existing and new specs.
- **III. Liskov Substitution**: No new interface with multiple implementations.
- **IV. Interface Segregation**: `OrgChartTree` receives the flat department list, the capability flag and three callbacks; dialogs receive the department (or template row) they edit plus the project id; services expose only the operations the resolvers call.
- **V. Dependency Inversion**: Services inject `PrismaService` and `ProjectAccessService`; `ProjectsService` injects `DepartmentTemplateService` for the copy; authorization is `assertMember`/`assertManager` in services, never resolver code; the web reads `project.can` and `stakeholder.isMember` instead of deriving them.
- **Technology Stack**: Prisma migration committed; `schema.graphql` regenerated and committed; web uses generated documents and types; routes are file-based; UI from shadcn (new primitives added through the shadcn CLI pinned in `.mcp.json`, never hand-written); every new resolver sits behind the global auth guard plus `@RequirePermission('projects', 'view' | 'edit')` with the project-role rule in the service.
- **Simplicity**: No repository layer, no DataLoader, no tree library, no new abstraction with a single implementation. The one helper function reused across services (`recordActivity`) already exists.
- **Design before code**: modules, services, resolvers, DTOs, entities, migration and routes are listed below.
- **Tests**: Red-green per story; e2e covers persistence, the cycle and duplicate rules, both removal policies, automatic unassignment, Member/non-member denial and the seed-once rule.

**Gate result (pre-research)**: Pass. **Gate result (post-design)**: Pass; no deviations, Complexity Tracking is empty.

## Permission model

- Reuses the `projects` area: listing and opening a project (`view`) and editing the suggested department list (`edit`, Admin by default). No new area or action.
- Inside a project the project role decides: **Manager** adds, edits, reorders and removes departments, sets contacts and seeds; **Member** views the chart and may tag their tasks and deliverables with a department (an edit to work they can already edit); non-members get `NotFound`.

## Project Structure

### Documentation (this feature)

```text
specs/009-project-org-chart/
├── spec.md
├── plan.md                 # this file
├── research.md             # decisions 1–11
├── data-model.md           # models, rules, activity rows
├── contracts/graphql.md    # types, queries, mutations, web documents
├── quickstart.md           # end-to-end validation
└── tasks.md                # /speckit-tasks output (not created here)
```

### Source Code

```text
apps/api/prisma/schema/projects.prisma                 + TemplateDepartment, ProjectDepartment, departmentId on task/deliverable, activity kinds
apps/api/prisma/migrations/<ts>_add_org_chart/         tables, columns, enum values, 12-row template seed
apps/api/src/feature/projects/
├── projects.module.ts                                 + DepartmentsService/Resolver, DepartmentTemplateService/Resolver
├── activity.ts                                        + five DEPARTMENT_* kinds
├── entities/enums.ts                                  + kinds, DepartmentContactSlot, DepartmentChildPolicy
├── entities/department.entity.ts                      ProjectDepartment, ProjectOrgChart
├── entities/template.entity.ts                        + TemplateDepartment
├── entities/project.entity.ts                         Project.orgChart, ProjectStakeholder.isMember, ProjectTask/Deliverable.departmentId
├── dto/department.input.ts                            AddDepartmentInput, UpdateDepartmentInput, DepartmentContactInput
├── dto/task.input.ts, dto/deliverable.input.ts        + departmentId
├── mappers.ts                                         PROJECT_INCLUDE + departments; toProject composes orgChart, isMember, counts
├── department-template.service.ts (+spec)             list, add, update, reorder, remove, copyInto(tx, projectId)
├── department-template.resolver.ts (+spec)            departmentTemplate query, four projects:edit mutations
├── departments.service.ts (+spec)                     add, update (rename/re-parent, cycle), reorder, remove(policy), setContact, seed
├── departments.resolver.ts (+spec)                    six Manager mutations
├── projects.service.ts                                create() calls departmentTemplate.copyInto(tx, id)
├── tasks.service.ts, deliverables.service.ts          departmentId validation on create/update
apps/api/test/org-chart.e2e-spec.ts                    persistence, rules, denial, seed-once, SetNull on contact removal
apps/api/schema.graphql                                regenerated
apps/web/src/feature/projects/
├── operations.ts                                      PROJECT additions + 11 new documents (contracts/graphql.md)
├── lib.ts (+ lib.test.ts)                             DepartmentData type, buildDepartmentTree, filterDepartmentTree, LABELS for new kinds
├── project/org-chart.tsx                              tab: header with unassigned count, search, tree, empty state with seed button
├── project/layout.tsx                                 + "Org chart" tab after Stakeholders
├── components/OrgChartTree.tsx (+test)                nested tree rows, badges, actions menu
├── components/DepartmentDialog.tsx                    add/edit: name, description, parent select
├── components/DepartmentContactDialog.tsx             slot, stakeholder picker, "New contact…" → StakeholderDialog, clear
├── components/RemoveDepartmentDialog.tsx              keep vs remove sub-departments
├── components/DepartmentSelect.tsx                    reused by TaskDialog and DeliverableDialog
├── components/TaskDialog.tsx, DeliverableDialog.tsx   + department field
├── components/TaskDetailSheet.tsx                     department + point person line
├── project/tasks.tsx, readiness.tsx                   department chip on rows
apps/web/src/feature/settings/template/
├── index.tsx                                          + <SuggestedDepartments />
└── SuggestedDepartments.tsx                           admin list: add, rename, reorder, remove
apps/web/src/routes/_protected/projects/$id/org-chart.tsx   one-line file route
apps/web/src/lib/navigation.ts                         + breadcrumb pattern for /projects/:id/org-chart
```

**Structure Decision**: The org chart is one more aggregate of the project, so it joins the
`projects` module as a pair of single-purpose services with their own resolvers, DTOs and
entities (research.md › Decision 1), and the web keeps it inside `feature/projects` as a new tab
with its own components. The admin list lives next to the existing template editor because it is
edited by the same people under the same permission.

## Module wiring

- `ProjectsModule` registers `DepartmentsService`, `DepartmentsResolver`,
  `DepartmentTemplateService`, `DepartmentTemplateResolver`; no new module imports.
- `ProjectsService` gains a constructor dependency on `DepartmentTemplateService` and calls
  `copyInto(tx, project.id)` inside its create transaction. No cycle: the template service
  depends only on `PrismaService`.
- `DepartmentsService` depends on `PrismaService` and `ProjectAccessService`; it reads
  `projectStakeholder` rows for validation but never writes them (stakeholders stay owned by
  `ProjectsService`).
- GraphQL: `Project.orgChart`, `ProjectStakeholder.isMember` and the `departmentId` fields are
  plain fields filled by the composed read in `mappers.ts`; no field resolvers.

## Deployment Notes

- `prisma migrate deploy` runs at api start, so the migration applies on the next deploy of
  `baseline` and the next restart of `baseline-dev`. The seed inserts the 12 template rows only.
- No new env vars. Rebuild both images and redeploy `baseline`; `baseline-dev` picks the code up live.

## Complexity Tracking

No deviations from the constitution; nothing to justify.
