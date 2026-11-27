# Contract: GraphQL additions (feature 010)

Additive only. Generated into `apps/api/schema.graphql`; consumed through `graphql()` documents
in `apps/web/src/feature/projects/operations.ts`.

## Types

```graphql
extend type ProjectTask {
  position: Float!
  predecessorConflict: Boolean!
}
extend type ProjectListItem {
  myOpenTasks: Int!
}

enum ProjectsSort {
  RECENT
  GO_LIVE
}

input MoveTaskInput {
  id: ID!
  status: TaskStatus
  phaseId: ID
  afterTaskId: ID
  beforeTaskId: ID
}
input MoveDeliverableInput {
  id: ID!
  phaseId: ID
  afterId: ID
  beforeId: ID
}
```

`ProjectTask` rows inside `Project.phases[].tasks` and `projectTasks(...)` are returned ordered
by `position` ascending (previously by due date then title; `projectTasks` keeps a `sort`
argument default `POSITION` with `DUE_DATE` as the old behaviour).

## Queries

| Query                                                                          | Access          | Change                                                                             |
| ------------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------- |
| `projects(page, perPage, sort: ProjectsSort = RECENT): ProjectsPage`           | `projects:view` | new `sort`; `RECENT` = updatedAt desc, `GO_LIVE` = targetGoLiveDate asc nulls last |
| `projectActivity(projectId, page, perPage, targetId: ID): ProjectActivityPage` | member          | new optional `targetId` filter (task side panel)                                   |
| `projectTasks(projectId, …, sort: TaskSort = POSITION)`                        | member          | new `sort` enum `POSITION \| DUE_DATE`                                             |

## Mutations

| Mutation                                                                    | Access | Rule / error                                                                   |
| --------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `moveProjectTask(input: MoveTaskInput!): ProjectTask!`                      | member | neighbours and phase in the same project; no-op returns unchanged, no activity |
| `moveProjectDeliverable(input: MoveDeliverableInput!): ProjectDeliverable!` | member | same rules; renumbers the target phase                                         |

Unchanged mutations used by drags: `updateProjectTask` (timeline shift/resize, inline edits),
`updateProjectPhase` (phase bars, Managers), `reorderProjectPhases` (phase drag), and
`createProjectTask` (quick-add: `title` + `phaseId` only; status, priority and position default).

Errors: `BAD_USER_INPUT` with the rule in the message ("Due date must not be before start date",
"Task not found in this project", "Phase not found in this project"); non-member `NOT_FOUND`;
Member moving a phase `FORBIDDEN`.

## Web documents (operations.ts)

- `PROJECT`: add `position predecessorConflict` to task fields.
- `PROJECT_LIST`: add `myOpenTasks` and the `$sort: ProjectsSort` variable.
- `PROJECT_ACTIVITY`: add `$targetId: ID`.
- New: `MOVE_PROJECT_TASK`, `MOVE_PROJECT_DELIVERABLE`.
