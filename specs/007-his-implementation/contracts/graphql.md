# Contract: GraphQL (increment 2)

Generated into `apps/api/schema.graphql`; the web consumes it through `graphql()` documents in
`apps/web/src/feature/projects/operations.ts`. Dates are `String` in `YYYY-MM-DD`.

## Types

```graphql
type PersonSummary { id: ID!, name: String!, email: String!, image: String }

type ProjectCapabilities { manage: Boolean!, edit: Boolean! }   # manage = Manager; edit = any member
type ProjectSummary { totalTasks: Int!, openTasks: Int!, overdueTasks: Int!, phaseCount: Int!, completePhases: Int!, progress: Int! }

type Project {
  id: ID!, name: String!, hospitalName: String!, description: String, status: ProjectStatus!
  startDate: String, targetGoLiveDate: String, createdAt: DateTime!, updatedAt: DateTime!
  myRole: ProjectRole!, can: ProjectCapabilities!, summary: ProjectSummary!
  phases: [ProjectPhase!]!, members: [ProjectMember!]!, stakeholders: [ProjectStakeholder!]!
  pendingInvites: [ProjectInvite!]!      # Managers only; [] otherwise
}
type ProjectListItem { id, name, hospitalName, status, startDate, targetGoLiveDate, myRole, summary, updatedAt }
type ProjectsPage { data: [ProjectListItem!]!, meta: PageMeta! }

type ProjectMember { user: PersonSummary!, role: ProjectRole!, addedAt: DateTime! }
type ProjectInvite { id: ID!, email: String!, role: ProjectRole!, expiresAt: DateTime! }

type ProjectPhase { id: ID!, name: String!, description: String, order: Int!, owner: PersonSummary, startDate: String, endDate: String, status: PhaseStatus!, tasks: [ProjectTask!]!, deliverables: [ProjectDeliverable!]! }

type ProjectTask { id: ID!, phaseId: ID!, title: String!, description: String, owner: PersonSummary, status: TaskStatus!, priority: TaskPriority!, startDate: String, dueDate: String, overdue: Boolean!, predecessor: TaskRef, createdAt: DateTime!, updatedAt: DateTime!, comments: [TaskComment!]! }
type TaskRef { id: ID!, title: String! }
type TaskComment { id: ID!, author: PersonSummary!, body: String!, mentions: [PersonSummary!]!, createdAt: DateTime! }

type ProjectDeliverable { id: ID!, phaseId: ID!, title: String!, kind: DeliverableKind!, owner: PersonSummary, reviewer: PersonSummary, dueDate: String, status: DeliverableStatus!, reviewOutcome: ReviewOutcome, reviewNote: String, reviewedAt: DateTime, links: [DeliverableLink!]!, order: Int! }
type DeliverableLink { label: String!, url: String! }

type ProjectStakeholder { id: ID!, name: String!, organization: String!, role: String!, email: String, phone: String, user: PersonSummary, notes: String }

type ProjectActivity { id: ID!, actor: PersonSummary, kind: ProjectActivityKind!, summary: String!, targetType: String, targetId: ID, createdAt: DateTime! }
type ProjectActivityPage { data: [ProjectActivity!]!, meta: PageMeta! }

type TemplatePhase { id: ID!, name: String!, description: String, order: Int!, deliverables: [TemplateDeliverable!]! }
type TemplateDeliverable { id: ID!, title: String!, kind: DeliverableKind!, order: Int! }
```

## Queries

| Query                                                                         | Access          | Notes                                                       |
| ----------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------- |
| `projects(page, perPage): ProjectsPage`                                       | `projects:view` | Projects the caller belongs to, most recently updated first |
| `project(id): Project`                                                        | member          | NotFound for non-members                                    |
| `projectActivity(projectId, page, perPage): ProjectActivityPage`              | member          | newest first                                                |
| `projectTasks(projectId, phaseId, ownerId, status, overdue): [ProjectTask!]!` | member          | FR-010 filters; sorted by dueDate then title                |
| `projectMemberCandidates(projectId, search): [PersonSummary!]!`               | Manager         | active users not yet members, up to 20                      |
| `implementationTemplate: [TemplatePhase!]!`                                   | `projects:view` | ordered                                                     |

## Mutations

| Mutation                                                                                                                                                                                | Access                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `createProject(input: CreateProjectInput!): Project!`                                                                                                                                   | `projects:add` (creator becomes Manager; template copied) |
| `updateProject(input: UpdateProjectInput!): Project!`                                                                                                                                   | Manager                                                   |
| `addProjectMember(projectId, userId, role): Project!`                                                                                                                                   | Manager                                                   |
| `inviteProjectMember(projectId, email, role): ProjectInvite!`                                                                                                                           | Manager (emails via 008)                                  |
| `setProjectMemberRole(projectId, userId, role): Project!`                                                                                                                               | Manager (keeps ≥ 1 Manager)                               |
| `removeProjectMember(projectId, userId): Project!`                                                                                                                                      | Manager (keeps ≥ 1 Manager)                               |
| `addProjectPhase(input): ProjectPhase!` / `updateProjectPhase(input)` / `reorderProjectPhases(projectId, phaseIds)` / `removeProjectPhase(id)`                                          | Manager                                                   |
| `createProjectTask(input): ProjectTask!` / `updateProjectTask(input)` / `deleteProjectTask(id): Boolean!`                                                                               | member                                                    |
| `addTaskComment(taskId, body, mentionUserIds): TaskComment!`                                                                                                                            | member (mentions must be members; emails mentioned users) |
| `addProjectDeliverable(input)` / `updateProjectDeliverable(input)` / `reviewProjectDeliverable(id, outcome, note)` / `removeProjectDeliverable(id)`                                     | member (review: reviewer or Manager)                      |
| `addProjectStakeholder(input)` / `updateProjectStakeholder(input)` / `removeProjectStakeholder(id): Boolean!`                                                                           | Manager                                                   |
| `addTemplatePhase(input)` / `updateTemplatePhase(input)` / `removeTemplatePhase(id)` / `reorderTemplatePhases(ids)` / `addTemplateDeliverable(input)` / `removeTemplateDeliverable(id)` | `projects:edit`                                           |

Errors: validation → `BAD_USER_INPUT` with the rule in the message ("Due date must not be before start date", "A task cannot depend on itself", "This dependency would create a cycle", "Move its tasks and deliverables first", "A project needs at least one Manager"); non-member → `NOT_FOUND`; wrong project role → `FORBIDDEN`.
