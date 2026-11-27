# Data Model: Project Org Chart

Prisma file: `apps/api/prisma/schema/projects.prisma` (the models belong to the `projects`
feature). One migration: `apps/api/prisma/migrations/<ts>_add_org_chart/`. Tables map to
snake_case.

## Enums

- `ProjectActivityKind` gains: `DEPARTMENT_ADDED`, `DEPARTMENT_UPDATED`, `DEPARTMENT_REMOVED`,
  `DEPARTMENTS_REORDERED`, `DEPARTMENT_CONTACT_CHANGED` (also in `activity.ts` and
  `entities/enums.ts`).
- GraphQL-only enums (registered in `entities/enums.ts`): `DepartmentContactSlot { POINT_PERSON,
ALTERNATE }`, `DepartmentChildPolicy { PROMOTE, REMOVE }`.

## Suggested department list (administrator-maintained, FR-005)

- `TemplateDepartment { id, name (1–80), order Int @unique, departments ProjectDepartment[] }`
  - Seeded by the migration with the 12 names in research.md › Decision 4 (ids `tdp_<slug>`).
  - Rules: only `projects:edit` may change it; names unique case-insensitively (service rule);
    `reorder(ids)` must list every row exactly once (two-pass renumbering as `TemplateService`).

## Project departments

- `ProjectDepartment { id, projectId → Project (Cascade), name (1–80), nameKey (lower(trim(name))),
description? (≤ 500), parentId? → ProjectDepartment (Restrict), order Int, pointPersonId? →
ProjectStakeholder (SetNull), alternateId? → ProjectStakeholder (SetNull), templateDepartmentId?
→ TemplateDepartment (SetNull), createdAt, updatedAt }`
  - `@@unique([projectId, nameKey])`, `@@index([projectId, parentId, order])`
  - Relations on `ProjectStakeholder`: `pointPersonOf ProjectDepartment[]`, `alternateOf
ProjectDepartment[]`; on `Project`: `departments ProjectDepartment[]`.
  - Rules (service, `DepartmentsService`):
    - `parentId` must be a department of the same project; a department cannot be its own
      ancestor (walk the parent chain, bounded at 100 hops) → `BAD_USER_INPUT`
      "A department cannot be moved under one of its own sub-departments".
    - `order` is contiguous from 1 within `(projectId, parentId)`; add appends; re-parenting
      appends under the new parent and closes the gap under the old one; `reorder(projectId,
parentId, ids)` must list every sibling exactly once.
    - Name uniqueness: `nameKey` collision → "A department with this name already exists".
    - Contacts: `pointPersonId`/`alternateId` must be stakeholders of the same project; the same
      stakeholder cannot hold both slots of one department ("Already the point person" /
      "Already the alternate"); `null` clears the slot.
    - Removal with `PROMOTE`: children get `parentId = removed.parentId`, appended after the
      existing siblings in their current order; with `REMOVE`: the subtree is deleted
      depth-first. Both inside one transaction with one activity row.
    - `seed(projectId)`: refused unless the project has zero departments ("The org chart already
      has departments"); copies `TemplateDepartment` rows in order with `templateDepartmentId`.
    - `copyInto(tx, projectId)`: same copy, called by `ProjectsService.create` inside its
      transaction (`DepartmentTemplateService`).

## Task and deliverable tag (FR-015, FR-016)

- `ProjectTask.departmentId? → ProjectDepartment (SetNull)`, `@@index([projectId, departmentId])`
- `ProjectDeliverable.departmentId? → ProjectDepartment (SetNull)`
- Rule (in `TasksService` / `DeliverablesService`): the department must belong to the same
  project → "Department not found in this project".

## Derived values (composed read, not stored)

- `ProjectStakeholder.isMember` = the stakeholder's `userId` is among `project.members`.
- `ProjectDepartment.openTaskCount` = tasks with this `departmentId` and status ≠ `COMPLETE`;
  `openDeliverableCount` = deliverables with this `departmentId` and status ≠ `READY`.
- `ProjectOrgChart.unassignedCount` = departments with `pointPersonId = null` (an alternate
  does not count, FR-009).
- `Project.orgChart.departments` are returned flat, ordered by `(parentId nulls first, order)`;
  the web builds the tree (`buildDepartmentTree`).

## Activity rows (FR-012)

| Change                               | kind                         | targetType   | summary example                                        |
| ------------------------------------ | ---------------------------- | ------------ | ------------------------------------------------------ |
| add department                       | `DEPARTMENT_ADDED`           | `department` | `added department Pharmacy`                            |
| rename, describe, re-parent          | `DEPARTMENT_UPDATED`         | `department` | `moved department Blood Bank under Laboratory`         |
| remove (either policy)               | `DEPARTMENT_REMOVED`         | `department` | `removed department Laboratory (sub-departments kept)` |
| reorder siblings                     | `DEPARTMENTS_REORDERED`      | `department` | `reordered departments under Medical Services`         |
| set / replace / clear a contact slot | `DEPARTMENT_CONTACT_CHANGED` | `department` | `set Maria Santos as point person for Pharmacy`        |

`details` for contact changes: `{ slot, from: stakeholderId | null, to: stakeholderId | null }`.
