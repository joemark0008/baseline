# Contract: GraphQL additions (feature 009)

Generated into `apps/api/schema.graphql`; consumed through `graphql()` documents in
`apps/web/src/feature/projects/operations.ts` (and `feature/settings/template/` for the admin
list). All additions are additive; no existing field changes type.

## Types

```graphql
enum DepartmentContactSlot { POINT_PERSON ALTERNATE }
enum DepartmentChildPolicy { PROMOTE REMOVE }
# ProjectActivityKind gains DEPARTMENT_ADDED, DEPARTMENT_UPDATED, DEPARTMENT_REMOVED,
# DEPARTMENTS_REORDERED, DEPARTMENT_CONTACT_CHANGED

type ProjectDepartment {
  id: ID!, name: String!, description: String, parentId: ID, order: Int!
  pointPerson: ProjectStakeholder, alternate: ProjectStakeholder
  openTaskCount: Int!, openDeliverableCount: Int!
  templateDepartmentId: ID
}
type ProjectOrgChart { departments: [ProjectDepartment!]!, unassignedCount: Int! }

extend type Project { orgChart: ProjectOrgChart! }               # in the composed project read
extend type ProjectStakeholder { isMember: Boolean! }           # linked user is a project member
extend type ProjectTask { departmentId: ID }
extend type ProjectDeliverable { departmentId: ID }

type TemplateDepartment { id: ID!, name: String!, order: Int! }

input AddDepartmentInput { projectId: ID!, name: String!, description: String, parentId: ID }
input UpdateDepartmentInput { id: ID!, name: String, description: String, parentId: ID }  # parentId: omitted = keep, null = make top-level
input DepartmentContactInput { departmentId: ID!, slot: DepartmentContactSlot!, stakeholderId: ID }  # null clears

# existing inputs gain an optional field
input CreateTaskInput { …, departmentId: ID }      input UpdateTaskInput { …, departmentId: ID }
input AddDeliverableInput { …, departmentId: ID }  input UpdateDeliverableInput { …, departmentId: ID }
```

## Queries

| Query                                        | Access          | Notes                     |
| -------------------------------------------- | --------------- | ------------------------- |
| `project(id).orgChart`                       | member          | existing query, new field |
| `departmentTemplate: [TemplateDepartment!]!` | `projects:view` | ordered by `order`        |

## Mutations

| Mutation                                                                                         | Access          | Rule / error                                                                       |
| ------------------------------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------- |
| `addProjectDepartment(input: AddDepartmentInput!): ProjectDepartment!`                           | Manager         | unique name; parent in same project                                                |
| `updateProjectDepartment(input: UpdateDepartmentInput!): ProjectDepartment!`                     | Manager         | unique name; no cycle ("…under one of its own sub-departments")                    |
| `reorderProjectDepartments(projectId: ID!, parentId: ID, ids: [ID!]!): [ProjectDepartment!]!`    | Manager         | `ids` lists every sibling under `parentId` exactly once                            |
| `removeProjectDepartment(id: ID!, children: DepartmentChildPolicy!): Boolean!`                   | Manager         | PROMOTE keeps sub-departments, REMOVE deletes the subtree                          |
| `setDepartmentContact(input: DepartmentContactInput!): ProjectDepartment!`                       | Manager         | stakeholder in same project; not both slots ("Already the point person")           |
| `seedProjectDepartments(projectId: ID!): [ProjectDepartment!]!`                                  | Manager         | only when the chart is empty ("The org chart already has departments")             |
| `addTemplateDepartment(name: String!): TemplateDepartment!`                                      | `projects:edit` | unique name                                                                        |
| `updateTemplateDepartment(id: ID!, name: String!): TemplateDepartment!`                          | `projects:edit` |                                                                                    |
| `reorderTemplateDepartments(ids: [ID!]!): [TemplateDepartment!]!`                                | `projects:edit` | every row exactly once                                                             |
| `removeTemplateDepartment(id: ID!): Boolean!`                                                    | `projects:edit` | existing projects unaffected (`SetNull`)                                           |
| `createProjectTask` / `updateProjectTask` / `addProjectDeliverable` / `updateProjectDeliverable` | member          | `departmentId` must belong to the project ("Department not found in this project") |

All project-scoped operations carry `@RequirePermission('projects', 'view')` plus the project-role
rule in the service (`assertManager` / `assertMember`); non-members get `NOT_FOUND`, Members
calling a Manager operation get `FORBIDDEN`, validation failures are `BAD_USER_INPUT` with the
message above. Every mutation writes its activity row in the same transaction.

## Web documents (operations.ts)

`PROJECT` gains `orgChart { unassignedCount departments { …ProjectDepartmentFields } }`,
`stakeholders { isMember }`, `departmentId` on tasks and deliverables. New documents:
`ADD_PROJECT_DEPARTMENT`, `UPDATE_PROJECT_DEPARTMENT`, `REORDER_PROJECT_DEPARTMENTS`,
`REMOVE_PROJECT_DEPARTMENT`, `SET_DEPARTMENT_CONTACT`, `SEED_PROJECT_DEPARTMENTS`,
`DEPARTMENT_TEMPLATE`, `ADD_TEMPLATE_DEPARTMENT`, `UPDATE_TEMPLATE_DEPARTMENT`,
`REORDER_TEMPLATE_DEPARTMENTS`, `REMOVE_TEMPLATE_DEPARTMENT`. Mutations refetch `PROJECT`
(or `DEPARTMENT_TEMPLATE`), as the existing documents do.
