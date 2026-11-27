# Quickstart: HIS Implementation Project Workspace

## Run

Sign in as an administrator at https://baseline-dev.joemarkgimeno.com (live dev) or locally with
`npm run dev:api` and `npm run dev:web`. Give a role `projects:view` and `projects:add` in
Settings › Roles if it is not Admin.

## Validate end to end

1. **Create a project** (US1): Projects › New project. Name, hospital, dates. The project opens
   on Overview with the nine phases in spec order; you are its Manager (Team tab).
2. **Tailor the plan** (US1): on Overview, rename a phase, set its owner and dates, reorder with
   the arrows, add a phase; refresh and the changes persist. Removing a phase with tasks is
   refused with "Move its tasks and deliverables first".
3. **Plan work** (US2): Tasks › New task: title, phase, owner, dates, priority, predecessor. Set a
   due date in the past and status Upcoming: the row and the timeline bar show Overdue. Try a
   due date before the start date, or a task depending on itself or on its own successor: the
   dialog shows the rule and nothing is saved. Filter by phase, owner, status and Overdue.
4. **Timeline** (US2): the Gantt groups task bars under phase bars with the dependency cue;
   it scrolls inside its own region at 375 px.
5. **Collaborate** (US3): Team › Add member (existing account) or Invite by email (the invite
   email is sent through Resend or logged). Comment on a task and @mention a member; the mention
   and an assignment each send one email. Activity lists who changed what and when. A
   non-member opening the project URL gets "Not found".
6. **Deliverables** (US4): Readiness tab: suggested deliverables per phase were copied from the
   template; add one, set owner, reviewer, due date, status and links; record a review outcome.
7. **Stakeholders** (US5): add hospital and vendor contacts; a contact is not a member.
8. **Template** (admin): Settings › Template: edit phases and suggested deliverables; a new
   project uses the edited template, existing projects do not change.

## Verify

```sh
npm test -w apps/api                               # unit + resolver specs
DATABASE_URL=<baseline_dev url> npm run test:e2e -w apps/api   # projects.e2e-spec.ts
npm run schema:check
npm run codegen -w apps/web && npm test -w apps/web -- --run
npm run typecheck && npm run lint && npm run build
```
