---
description: 'Executable tasks for the first HIS implementation UI review slice'
---

# Tasks: HIS Implementation Workspace UI Review

**Input**: Design documents from `/specs/007-his-implementation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/preview-ui.md`, `quickstart.md`

**Scope note**: These tasks deliver the first public, read-only visual review route only. They do not complete the full product spec or implement persistence, project membership, real collaboration, or database-backed editing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable only when files/dependencies do not overlap.
- Story labels map to user stories in `spec.md`.
- Tests are included because project rules require them and implementation follows TDD.

## Phase 1: Setup

**Purpose**: Confirm the existing frontend can run and identify the route/test conventions without reinitializing the project or Git.

- [x] T001 Verify Node/npm, the root workspace manifest in `package.json`, and the existing Vite frontend scripts in `apps/web/package.json`; do not reinitialize Git or run `scripts/init.sh`.
- [x] T002 [P] Install locked workspace dependencies from `package-lock.json` with `npm ci`.

---

## Phase 2: User Story 1 - Review an HIS implementation project overview (Priority: P1) 🎯 MVP

**Goal**: Open a public demo route and understand the fictional hospital implementation, current phase, progress, target go-live, and immediate work at a glance.

**Independent Test**: Render `ProjectPreviewPage` and verify the demo label, fictional project identity, current status, progress summary, target date, and key overview sections are present. Confirm `/` and protected auth routes are not changed.

### Tests for User Story 1

- [x] T003 [P] [US1] Write the overview render test in `apps/web/src/feature/implementation-preview/index.test.tsx` and run it to confirm it fails because the preview is not implemented.

### Implementation for User Story 1

- [x] T004 [US1] Define fictional project, team, phase, task, deliverable, and activity fixtures in `apps/web/src/feature/implementation-preview/project-fixture.ts`.
- [x] T005 [US1] Build the project overview page and summary sections in `apps/web/src/feature/implementation-preview/index.tsx` and `apps/web/src/feature/implementation-preview/ProjectOverview.tsx`.
- [x] T006 [US1] Add the public `/preview` file route in `apps/web/src/routes/preview.tsx` without changing `apps/web/src/routes/index.tsx`, `apps/web/src/routes/_protected.tsx`, or auth guards.
- [x] T007 [US1] Run the targeted preview test and verify that the overview render test passes.

**Checkpoint**: A signed-out visitor can open `/preview` and see a credible, clearly labeled HIS implementation overview using fictional data.

---

## Phase 3: User Story 2 - Review the implementation timeline and tasks (Priority: P1)

**Goal**: Show the lifecycle phases and representative task schedule in a Gantt-style timeline, with a separate task view and local filters.

**Independent Test**: Switch to Timeline and Tasks views; verify all nine phases, dated task bars, task ownership/status, and overdue filtering are readable and functional using the fixture.

### Tests for User Story 2

- [x] T008 [P] [US2] Add timeline and phase-order assertions in `apps/web/src/feature/implementation-preview/index.test.tsx`; run them and confirm they fail before the timeline exists.
- [x] T009 [P] [US2] Add task-view and overdue-filter interaction assertions in `apps/web/src/feature/implementation-preview/index.test.tsx`; run them and confirm they fail before task filtering exists.

### Implementation for User Story 2

- [x] T010 [US2] Implement responsive Gantt phase/task rows and milestone cues in `apps/web/src/feature/implementation-preview/ProjectTimeline.tsx` using existing theme tokens and no new chart dependency.
- [x] T011 [US2] Implement the task list, owner/status display, and local status/overdue filters in `apps/web/src/feature/implementation-preview/ProjectTasks.tsx`.
- [x] T012 [US2] Connect Overview, Timeline, Tasks, and Data Readiness view controls to local UI state in `apps/web/src/feature/implementation-preview/index.tsx`.
- [x] T013 [US2] Run the targeted tests and confirm timeline, phase ordering, view switching, and task filters pass.

**Checkpoint**: The project plan and task queue can be reviewed independently of backend availability.

---

## Phase 4: User Story 3 - See the hospital/vendor collaboration context (Priority: P1)

**Goal**: Make the sample team and recent project activity visible so stakeholders can review the collaboration model.

**Independent Test**: Verify fictional client/vendor participants, roles, initials, and recent activity are rendered with no real contacts or patient information.

### Tests for User Story 3

- [x] T014 [P] [US3] Add team/activity rendering assertions in `apps/web/src/feature/implementation-preview/index.test.tsx` and verify the test fails before those sections are added.

### Implementation for User Story 3

- [x] T015 [US3] Implement the fictional team and activity sections in `apps/web/src/feature/implementation-preview/ProjectOverview.tsx` or a focused `apps/web/src/feature/implementation-preview/TeamActivity.tsx` component.
- [x] T016 [US3] Run the targeted tests and verify sample roles/activity render accessibly; do not add real comments, invitations, or notifications in this demo slice.

**Checkpoint**: Reviewers can see who collaborates and what project events are surfaced, while understanding this is sample data only.

---

## Phase 5: User Story 4 - Review data-readiness deliverables (Priority: P2)

**Goal**: Show how implementation deliverables and master-data readiness fit into the project lifecycle.

**Independent Test**: Open Data Readiness and verify deliverable names, phase, owner, due date, and readiness status are visible.

### Tests for User Story 4

- [x] T017 [P] [US4] Add data-readiness view assertions in `apps/web/src/feature/implementation-preview/index.test.tsx` and verify they fail before the view is implemented.

### Implementation for User Story 4

- [x] T018 [US4] Implement the data-readiness checklist/table in `apps/web/src/feature/implementation-preview/DataReadiness.tsx` using existing `Table`, `Badge`, `Card`, and `QueryStateRow` conventions where applicable.
- [x] T019 [US4] Connect the readiness section to project fixtures and verify the targeted tests pass.

**Checkpoint**: Reviewers can see representative data preparation and validation handoffs without actual source data or patient records.

---

## Phase 6: Polish and cross-cutting review

**Purpose**: Verify layout quality, route behavior, and readiness for a Coolify visual review.

- [x] T020 [P] Add responsive and keyboard-accessibility assertions for the preview in `apps/web/src/feature/implementation-preview/index.test.tsx`.
- [x] T021 Ensure preview styles use existing theme tokens, existing shadcn/UI controls, and internal horizontal scrolling for the timeline in `apps/web/src/feature/implementation-preview/`.
- [x] T022 Run `npm test -w apps/web -- --run` and fix any frontend regressions.
- [x] T023 Run `npm run typecheck -w apps/web` and `npm run build -w apps/web`.
- [x] T024 Run the UI review checklist from `.claude/skills/ui-design/references/checklist.md` and record any non-applicable items in the final report.
- [x] T025 Validate the quickstart route locally at `/preview`; confirm the existing `/` login/setup redirect is unchanged.

---

## Dependencies & Execution Order

- Setup tasks precede implementation; install dependencies before running frontend tests.
- US1 is the MVP and must pass before proceeding to other sections.
- US2 depends on the shared fixture and overview component from US1.
- US3 and US4 use the same fixture and can be implemented after US1; their tests remain separate story checkpoints.
- Polish tasks follow all desired preview sections.

### Parallel Opportunities

- T002 can run independently of reviewing docs.
- Tests T008 and T009 can be authored in the same test file but should be run as separate RED checks before implementation.
- US3 and US4 components can be developed in parallel after the fixture is stable, but avoid concurrent edits to `index.tsx` and `index.test.tsx`.

## Implementation Strategy

1. Complete setup and install dependencies.
2. Implement US1 through a RED-GREEN cycle and verify the public preview route.
3. Add timeline and task interactions (US2), each with failing tests first.
4. Add read-only team/activity and readiness sections (US3/US4).
5. Run the frontend test suite, typecheck, build, and UI checklist.
6. Deploy the frontend preview through Coolify only after local validation; report the live URL only after verifying it responds successfully.

## Notes

- The first demo is read-only and uses only fictional fixture data; it does not complete the full production requirements in `spec.md`.
- Do not add database or authentication changes for this visual review increment.
- Any future change that modifies user-visible behavior must continue the test-first cycle.

## Phase 7: Convergence

- [x] T026 Restructure the preview feature to the house layout `apps/web/src/feature/projects/preview/` (`index.tsx`, `index.test.tsx`, `fixture.ts`, `components/ProjectOverview.tsx`, `components/ProjectTimeline.tsx`, `components/ProjectTasks.tsx`, `components/DataReadiness.tsx`, `components/TeamActivity.tsx`) and point `apps/web/src/routes/preview.tsx` and `plan.md` at it per Constitution: Frontend feature layout (contradicts)
- [x] T027 Add task rows under each phase with due-date markers and predecessor cues to `apps/web/src/feature/projects/preview/components/ProjectTimeline.tsx` per FR-007 / contracts/preview-ui.md §3 (partial)
- [x] T028 Add the priority column to the task table in `apps/web/src/feature/projects/preview/components/ProjectTasks.tsx` per contracts/preview-ui.md §4 (partial)
- [x] T029 Derive current phase, target go-live, due-this-week count and the timeline window from the fixture instead of literals in `components/ProjectOverview.tsx` and `components/ProjectTimeline.tsx` per plan: data model / research D4 (partial)
- [x] T030 Add keyboard and responsive assertions (view switching by keyboard, focusable scrolling timeline, pressed state on filters) to `apps/web/src/feature/projects/preview/index.test.tsx` per T020 (partial)
- [x] T031 Record the top-level `routes/preview.tsx` placement as a justified deviation from the `routes/_public/` rule in `plan.md` Complexity Tracking, or move the route, per Constitution: Frontend routing (contradicts)
- [x] T032 Review the `HISD3` organization label in the fixture against research D3 (fictional labels); keep with a recorded justification or replace with a neutral vendor label (contradicts)
