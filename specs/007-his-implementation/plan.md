# Implementation Plan: HIS Implementation Project Workspace

**Branch**: `007-his-implementation` | **Date**: 2026-11-27 | **Spec**: `specs/007-his-implementation/spec.md`

**Input**: Feature specification from `/specs/007-his-implementation/spec.md` (clarified 2026-11-26)

## Summary

Increment 1 (done) shipped a read-only `/preview` with fixture data. Increment 2, this plan, builds
the product the spec describes and removes the preview: persisted implementation projects with the
administrator-maintained nine-phase template, project membership with Manager and Member roles,
phases, tasks with owners, dates, predecessors and overdue detection, a Gantt timeline from real
data, task comments with @mentions, an activity history, phase deliverables and data-readiness
tracking with links, a stakeholder directory, and email on invite, mention and assignment through
feature 008. One NestJS feature module (`feature/projects`), one Prisma migration, one web feature
(`feature/projects`) with file routes under `/_protected/projects`, and an admin template page.

## Technical Context

**Language/Version**: TypeScript 6 on Node.js 22; NestJS 12, React 19

**Primary Dependencies**: Existing stack only: Prisma 7, code-first GraphQL (Apollo 4), Better Auth, Vite 8, TanStack Router, shadcn/ui, Vitest, React Testing Library, `resend` (008). No additions.

**Storage**: PostgreSQL 16 (shared instance). New tables listed in `data-model.md`; the existing `invite` table gains two nullable columns.

**Testing**: Unit specs beside services (fake Prisma via `useValue`), resolver specs, a web component suite for the timeline, task form and dialogs, and e2e specs under `apps/api/test/` against `DATABASE_URL` (run against the `baseline_dev` database).

**Target Platform**: The two existing containers; no new env vars.

**Project Type**: Web application (api + web)

**Performance Goals**: `project(id)` returns a 100-task project with phases, deliverables, members and stakeholders in one query under 300 ms; the timeline renders 100 rows without layout jank and scrolls inside its own region.

**Constraints**: Non-members get `NotFound` for any project data (no existence leak); every material change writes an activity row in the same transaction; emails never fail the mutation; no patient data fields anywhere; calendar dates are `YYYY-MM-DD` strings end to end (no time-zone shifts).

**Scale/Scope**: Dozens of projects, hundreds of tasks per project, tens of members. No DataLoader: a project is read by one composed query.

## Constitution Check

- **I. Single Responsibility**: `ProjectAccessService` answers membership questions only; `ProjectsService` owns project, member and stakeholder lifecycle; `PhasesService`, `TasksService` and `DeliverablesService` each own one aggregate; `recordActivity` writes history; templates live in `TemplateService`. Resolvers map arguments and session identity to service calls.
- **II. Open/Closed**: Activity kinds and statuses are enums extended by adding values; a new tab is a new route and component, not an edit of existing ones; email kinds are new template functions (008).
- **III. Liskov Substitution**: No new interface with multiple implementations. The `EmailTransport` contract from 008 is reused unchanged.
- **IV. Interface Segregation**: Web components receive the generated fragment types they render; services expose only the operations the resolvers call.
- **V. Dependency Inversion**: Services inject `PrismaService`, `AccessService`, `InvitesService` and `EmailService` through Nest modules; project authorization is a service rule (`assertMember`/`assertManager`), never resolver code; the web reads `Project.can` instead of re-deriving roles.
- **Technology Stack**: Prisma migration committed; `schema.graphql` regenerated and committed; web uses generated types; routes are file-based; UI primitives from shadcn; every new resolver is behind the global auth guard plus `@RequirePermission('projects', …)` for area-level operations and the project-role rules for the rest.
- **Design before code**: Modules, services, resolvers, DTOs, entities, migration and routes are listed below.
- **Tests**: Red-green per story; e2e covers persistence and the non-member denial.

**Gate result**: Pass.

## Permission model

- New permission area `projects` (`feature/projects/projects.access.ts`): `view` "See and open the projects you belong to", `add` "Create implementation projects", `edit` "Edit the standard implementation template". Admin has every action; Member gets `projects:view` by default through its existing grants only if an administrator grants it (the roles grid shows the new area).
- Inside a project, the **project role** decides: Manager tailors the plan, manages members, stakeholders and the project record; Member creates and edits tasks, deliverables and comments. Non-members are denied with `NotFound`. A project always keeps at least one Manager.
- Project invites by email reuse `InvitesService` (feature 008 emails the link): the invite carries `projectId` and `projectRole`; accepting it adds the membership.

## Project Structure

### Documentation (this feature)

```text
specs/007-his-implementation/
├── spec.md
├── plan.md                 # this file (increment 2)
├── research.md             # increment 1 + 2 decisions
├── data-model.md           # Prisma models and rules
├── contracts/graphql.md    # GraphQL types, queries and mutations
├── contracts/preview-ui.md # increment 1 (superseded)
├── quickstart.md
└── tasks.md                # increment 1 (done) + increment 2 phases
```

### Source Code

```text
apps/api/prisma/schema/projects.prisma            models + enums (data-model.md)
apps/api/prisma/schema/invites.prisma             Invite.projectId?, Invite.projectRole?
apps/api/prisma/migrations/<ts>_add_projects/     tables + template seed (nine phases, deliverables)
apps/api/src/feature/projects/
├── projects.module.ts
├── projects.access.ts                            area "projects"
├── project-access.service.ts (+spec)             membershipFor, assertMember, assertManager
├── activity.ts                                   recordActivity(tx, entry)
├── dates.ts (+spec)                              isoDate ⇄ Date, isOverdue
├── template.service.ts (+spec)                   list/edit the standard template (Admin or projects:edit)
├── projects.service.ts (+spec)                   create from template, list mine, get, update, members, invites, stakeholders, activity
├── phases.service.ts (+spec)                     add, update, reorder, remove (refuses non-empty)
├── tasks.service.ts (+spec)                      create, update, delete, list filters, comments + mentions, validation (dates, self/cycle)
├── deliverables.service.ts (+spec)               add, update, review, remove
├── projects.resolver.ts (+spec)                  Project queries/mutations, members, stakeholders, activity, can, summary
├── phases.resolver.ts, tasks.resolver.ts, deliverables.resolver.ts, template.resolver.ts
├── dto/*.input.ts, dto/*.output.ts               see contracts/graphql.md
└── entities/*.entity.ts
apps/api/src/feature/access/areas.ts              + projectsArea
apps/api/src/feature/invites/                     inviteUser gains project fields; accept adds membership
apps/api/src/email/email.templates.ts             + projectInviteEmail, taskAssignedEmail, mentionEmail
apps/api/src/email/email.service.ts               + sendProjectInvite, sendTaskAssigned, sendMention
apps/api/test/projects.e2e-spec.ts                persistence, denial, template copy, cycle rule
apps/web/src/feature/projects/
├── index.tsx                                     list + "New project" dialog
├── operations.ts                                 all documents
├── project/layout.tsx                            header, summary strip, tab links
├── project/overview.tsx, timeline.tsx, tasks.tsx, readiness.tsx, team.tsx, stakeholders.tsx, activity.tsx
├── components/                                   ProjectForm, PhaseEditor, TaskDialog, TaskDetailSheet, DeliverableDialog, MemberDialog, StakeholderDialog, Gantt, StatusBadge
└── *.test.tsx
apps/web/src/feature/settings/template/           admin template editor
apps/web/src/routes/_protected/projects.tsx, projects/index.tsx, projects/$id.tsx, projects/$id/{index,timeline,tasks,readiness,team,stakeholders,activity}.tsx
apps/web/src/routes/_protected/settings/template.tsx
apps/web/src/lib/navigation.ts, lib/guards.ts     Projects entry, Settings › Template, route permissions, detail crumbs
apps/web/src/routes/preview.tsx, feature/projects/preview/   removed
```

**Structure Decision**: One feature module with several services keeps the aggregate rules together while each service stays single-purpose; one web feature folder with a layout route and tab routes mirrors it. The preview folder is deleted: its components are rewritten against generated types rather than kept as a second UI.

## Module wiring

- `ProjectsModule` imports nothing new (global Prisma, Env, Email); it injects `AccessService` (exported by `AccessModule`) and `InvitesService` (exported by `InvitesModule`), so `AppModule` imports it after those.
- `InvitesModule` must not import `ProjectsModule` (cycle). Accepting a project invite therefore adds the membership inside `InvitesService.accept` with a small `ProjectMembershipWriter` callback registered by `ProjectsModule` on boot (`invites.setProjectJoin(fn)`), keeping `invites` unaware of project rules.
- `AccessModule`'s area catalogue gains `projectsArea`.

## Deployment Notes

- `prisma migrate deploy` runs at api start (already), so the new migration applies on the next deploy of `baseline` and on the next restart of `baseline-dev`.
- No new env vars. Rebuild both images and redeploy `baseline`; `baseline-dev` picks the code up live.

## Complexity Tracking

| Addition                                                                   | Justification                                                                                                        | Simpler alternative rejected                                                                                                     |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ProjectMembershipWriter` callback in `InvitesService`                     | Avoids a module cycle while letting an accepted email invite join the project in the same transaction                | Polling pending project invites after sign-in (racy, second round trip); importing `ProjectsModule` into `InvitesModule` (cycle) |
| Composed `project(id)` read instead of per-field resolvers with DataLoader | One project is read at a time; a single composed query keeps the resolver thin and avoids N+1 without a loader layer | Field resolvers for phases/tasks/deliverables (N+1 for 100 tasks)                                                                |
