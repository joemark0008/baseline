---
description: 'Executable tasks for keeping large projects readable (feature 011)'
---

# Tasks: Keep Large Projects Readable

**Input**: Design documents from `/specs/011-large-project-readability/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/graphql.md`, `contracts/ui-interaction.md`, `quickstart.md`

**Tests**: Included. The constitution makes unit tests mandatory for every behaviour change;
each story's tests are written first, run to fail, then made green.

**Organization**: Grouped by user story. The `completedAt` timestamp, the extended search
schema, the extended view preference and the `useReadability()` provider are foundational
because every story reads them. Field constraints are cited as `data-model.md › Entity.field`
and not restated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on an unfinished task).
- Story labels: US1 Hide done, US2 Search, US3 Folding, US4 Lanes.
- Paths are repository-relative. API code in `apps/api/src/feature/projects/`, web code in `apps/web/src/feature/projects/`.

## Path Conventions

- Node and npm run inside the dev containers on the server (`docker exec -it web-<uuid> sh`, `docker exec -it api-<uuid> sh`, see `plan.md › Target Platform`); git runs on the host.
- After entity changes: `npm run schema:generate`, commit `apps/api/schema.graphql`; after `operations.ts` changes: `npm run codegen -w apps/web`.
- UI follows `.claude/skills/ui-design/SKILL.md`; primitives from `apps/web/src/components/ui/` (input, button, badge, collapsible, tooltip, dropdown-menu all exist). Interaction follows `contracts/ui-interaction.md` exactly; drag behaviour from feature 010 is unchanged.
- The uncommitted phase-number URL change (`?phase=2`, `phaseAt`/`phaseNumber` in `lib.ts`) is part of this feature's baseline; keep it.

---

## Phase 1: Setup

**Purpose**: A green baseline that includes the uncommitted phase-number change.

- [x] T001 Run `npm test -w apps/api`, `npm run test:e2e -w apps/api` (against `baseline_dev`), `npm test -w apps/web -- --run`, `npm run lint` and `npm run format:check` in the dev containers to confirm a green baseline before changes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The completion timestamp, the extended search schema, the extended per-device preference, the readability provider and the visibility pipeline every view uses.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### API

- [x] T002 Add `completedAt DateTime?` to `ProjectTask` in `apps/api/prisma/schema/projects.prisma` (`data-model.md › ProjectTask.completedAt`).
- [x] T003 Create the migration with `npx prisma migrate dev --create-only -n add_task_completed_at` in `apps/api`, append the backfill `UPDATE "project_task" SET "completedAt" = "updatedAt" WHERE "status" = 'COMPLETE'` from `data-model.md › Changed model`, apply with `npx prisma migrate dev`, and regenerate the client.
- [x] T004 [P] Write failing cases in `apps/api/src/feature/projects/completion.spec.ts` for `completionStamp(prev, next, now)`: `UPCOMING → COMPLETE` gives `{ completedAt: now }`; `COMPLETE → IN_PROGRESS` gives `{ completedAt: null }`; `COMPLETE → COMPLETE` and `UPCOMING → BLOCKED` give `{}`; `null → COMPLETE` (creation) gives `{ completedAt: now }`.
- [x] T005 [P] Implement `completionStamp` in `apps/api/src/feature/projects/completion.ts` (pure, exported; `now` defaults to `new Date()`); make T004 pass.
- [x] T006 Write failing cases in `apps/api/src/feature/projects/tasks.service.spec.ts`: `create` with `status: COMPLETE` writes `completedAt`; `update` to `COMPLETE` writes it and back to `IN_PROGRESS` clears it; `update` of the title alone leaves `completedAt` untouched; `move` with a status change to `COMPLETE` writes it; a no-op `move` writes nothing (existing case still holds). Extend the fake task rows with `completedAt`.
- [x] T007 Apply `completionStamp` in `TasksService.create`, `update` and `move` in `apps/api/src/feature/projects/tasks.service.ts` (`contracts/graphql.md › Behavioural rules`); make T006 pass.
- [x] T008 [P] Add `completedAt: Date | null` (`@Field(() => Date, { nullable: true })`, description from `contracts/graphql.md › Types`) to `ProjectTask` in `apps/api/src/feature/projects/entities/project.entity.ts`; copy it in `toTask` in `apps/api/src/feature/projects/mappers.ts`; add a case to `apps/api/src/feature/projects/mappers.spec.ts`; run `npm run schema:generate` and commit `apps/api/schema.graphql`.
- [x] T009 Add cases to `apps/api/test/workspace.e2e-spec.ts`: `updateProjectTask` to `COMPLETE` returns a non-null `completedAt` within a few seconds of now; moving it back to `IN_PROGRESS` returns null; `moveProjectTask` with `status: COMPLETE` sets it; after the migration every `COMPLETE` row in the fixture has `completedAt` set (query through Prisma in the test). Run; passes once T007–T008 are in.

### Web

- [x] T010 Add `completedAt` to every task selection in `PROJECT` and `PROJECT_TASK` in `apps/web/src/feature/projects/operations.ts`; run `npm run codegen -w apps/web`.
- [x] T011 Write failing cases in `apps/web/src/feature/projects/lib.test.ts` for: `parseWorkSearch` accepting `q` (trimmed, empty dropped, cut at 100 characters) and `mine` (`true`/`'true'` only) per `data-model.md › WorkSearch.q` and `WorkSearch.mine`; `normaliseText('Éducation ') === 'education'`; `isRecentlyDone(task, now)` true at 6 days 23 h, false at 7 days 1 h, false when not complete; `visibleTasks(tasks, ctx)` precedence from `data-model.md › Derived values` (done hidden unless `showDone`, `search.status === 'COMPLETE'`, `task.id === search.task`, or recent-and-`recentDoneVisible`); `mine` by owner id; `q` on title and owner name; `doneCountByPhase`, `hiddenDoneCount`, `matchCounts`, `emptyReason` returning each of `none | all-done | no-match | only-done-match`.
- [x] T012 Implement the `WorkSearch` extension, `normaliseText`, `isRecentlyDone`, `visibleTasks`, `doneCountByPhase`, `hiddenDoneCount`, `matchCounts` and `emptyReason` in `apps/web/src/feature/projects/lib.ts`; remove `applyWorkFilters` and update its three callers (`project/board.tsx`, `project/list.tsx`, `project/timeline.tsx`) to `visibleTasks` with `showDone: false`, `userId` from `useCurrentUser()`, `now: new Date()`; make T011 pass.
- [x] T013 [P] Write failing cases in `apps/web/src/feature/projects/view-preferences.test.ts`: round-trip of `showDone`, `collapsed` and `boardLayout` (`data-model.md › ViewPreference.showDone`, `ViewPreference.collapsed`, `ViewPreference.boardLayout`); defaults when the keys are missing or malformed; `collapsed` ids absent from the supplied phase list are dropped on read.
- [x] T014 [P] Extend `readViewPreference(projectId, phaseIds)` / `writeViewPreference` in `apps/web/src/feature/projects/view-preferences.ts` with the three keys and the stale-id filter; make T013 pass; update the caller in `apps/web/src/feature/projects/project/layout.tsx` and the redirect in `apps/web/src/routes/_protected/projects/$id/work.tsx` to the new signature.
- [x] T015 Write failing cases in `apps/web/src/feature/projects/readability.test.tsx`: the provider reads the preference on mount, `toggle` flips one phase, `collapseAll(ids)` / `expandAll()` set and clear, `setShowDone` and `setLayout` write through, and a second project id starts from its own stored values.
- [x] T016 Create `apps/web/src/feature/projects/readability.tsx` exporting `ReadabilityProvider({ projectId, phaseIds, children })` and `useReadability()` returning `{ showDone, setShowDone, layout, setLayout, isCollapsed, toggle, collapseAll, expandAll }` backed by `view-preferences.ts` (`research.md › Decisions 2, 5`); wrap `<Outlet />` in it in `apps/web/src/feature/projects/project/layout.tsx`; make T015 pass.
- [x] T017 Extend `validateWorkSearch` consumers so `q` and `mine` survive navigation: confirm `apps/web/src/feature/projects/project/work-search.ts` and `apps/web/src/routes/_protected/projects/$id.tsx` need no change beyond `parseWorkSearch`, and add a route-level test case in `apps/web/src/feature/projects/lib.test.ts` that `parseWorkSearch({ q: ' lab ', mine: 'true', phase: '2' })` yields `{ q: 'lab', mine: true, phase: 2 }`.

**Checkpoint**: API unit and e2e green with `completedAt`; codegen clean; `visibleTasks`, the preference keys and `useReadability()` exist with tests; views render exactly as before (showDone forced false, no search box yet).

---

## Phase 3: User Story 1 - Finished work stays out of the way (Priority: P1) 🎯 MVP

**Goal**: Completed tasks hidden by default on Board and List with a seven-day recent window in the Complete column, hidden counts, one "Show done" control remembered per project on the device, precedence for the Complete status filter and for a directly opened task.

**Independent Test**: `quickstart.md` steps 1 and 2.

### Tests for User Story 1

- [x] T018 [P] [US1] Write failing cases in `apps/web/src/feature/projects/components/EmptyWork.test.tsx`: each `reason` renders the message and action from `contracts/ui-interaction.md › Empty states`; `onShowDone` and `onClear` fire.
- [x] T019 [P] [US1] Write failing cases in `apps/web/src/feature/projects/project/board.test.tsx`: with done hidden, old completed cards are absent, cards completed today are present, the Complete column header reads "N done hidden" with a "Show done" button; pressing it shows all and the button reads "Hide done"; status filter Complete shows all with done hidden; `?task=<old done id>` reveals that card.
- [x] T020 [P] [US1] Write failing cases in `apps/web/src/feature/projects/components/TaskList.test.tsx`: group headers show `open`, `overdue` and `N done` figures; done rows absent when hiding and present in manual order when showing; a drop computes neighbours from the full order even when done rows are hidden (`research.md › Decision 6`).

### Implementation for User Story 1

- [x] T021 [P] [US1] Create `apps/web/src/feature/projects/components/EmptyWork.tsx` (`{ reason, hiddenDone, onShowDone, onClear }`, shadcn `Button`, muted text); make T018 pass.
- [x] T022 [US1] Add the "Show done (N)" / "Hide done" toggle (`aria-pressed`) to `apps/web/src/feature/projects/project/work-filters.tsx`, reading `useReadability()` and a `hiddenDone` prop; render it on Board and List only.
- [x] T023 [US1] In `apps/web/src/feature/projects/project/board.tsx`: call `visibleTasks` with `showDone` from `useReadability()`, `recentDoneVisible: true`, `now`; pass `hiddenDone` to the filter bar and to `Board`; render `EmptyWork` when the visible set is empty with the `emptyReason` result. In `apps/web/src/feature/projects/components/BoardColumn.tsx` and `Board.tsx` show the "N done hidden · Show done" figure on the Complete column header; make T019 pass.
- [x] T024 [US1] In `apps/web/src/feature/projects/project/list.tsx`: `visibleTasks` with `recentDoneVisible: false`; pass `doneCountByPhase(allTasks)` and the full task list (for neighbours) to `TaskList`; render `EmptyWork`. In `apps/web/src/feature/projects/components/TaskList.tsx` build `source` for neighbours from the full list and the visible groups from the filtered list; in `apps/web/src/feature/projects/components/TaskListGroup.tsx` add the `open · overdue · done` header figures (`contracts/ui-interaction.md › Headers and counts`); make T020 pass.
- [x] T025 [US1] In `apps/web/src/feature/projects/project/timeline.tsx` apply `visibleTasks` with `recentDoneVisible: false` so the Timeline hides done tasks under the same setting, and show the "N done hidden" note above the chart with the toggle.
- [x] T026 [US1] Verify `quickstart.md` steps 1 and 2 on `baseline-dev`, including that the project header, project card and Overview figures do not change (FR-020).

**Checkpoint**: Mature projects open on open work only; the toggle, the recent window and the precedence rules work and persist; all tests green.

---

## Phase 4: User Story 2 - Find work by typing (Priority: P1)

**Goal**: A debounced search box and a "Mine" switch in the shared filter bar, carried in the URL across views, with match counts per column and group, Escape to clear, `/` to focus, and the three empty states.

**Independent Test**: `quickstart.md` steps 3, 4 and 5.

### Tests for User Story 2

- [x] T027 [P] [US2] Write failing cases in `apps/web/src/feature/projects/components/SearchBox.test.tsx`: typing echoes immediately and calls `onChange` once after 150 ms idle (fake timers); Escape clears and calls `onClear`; the clear button does the same; `aria-label="Search tasks"`; `/` on the document focuses the input and `/` typed inside it is not swallowed.
- [x] T028 [P] [US2] Write failing cases in `apps/web/src/feature/projects/project/work-filters.test.tsx` (create): the Mine toggle writes `mine: true` and removes it; the search box writes `q`; both read back from the search; `n` pressed inside the search box does not trigger the quick-add shortcut.
- [x] T029 [P] [US2] Add cases to `apps/web/src/feature/projects/project/board.test.tsx` and `apps/web/src/feature/projects/components/TaskList.test.tsx`: with `q` set, column and group headers read "matching of total"; a search matching nothing renders `EmptyWork` with reason `no-match`; a search matching only hidden done tasks renders `only-done-match` with "Show done"; a drag of a visible card with a search active still produces the right neighbours from the full order.

### Implementation for User Story 2

- [x] T030 [P] [US2] Create `apps/web/src/feature/projects/components/SearchBox.tsx` (`{ value, onChange, onClear, inputRef? }`, shadcn `Input type="search"`, local state + 150 ms debounce, Escape, clear button, `useShortcut('/')` focus); make T027 pass.
- [x] T031 [US2] Add `SearchBox` and the Mine toggle (`aria-pressed`) to `apps/web/src/feature/projects/project/work-filters.tsx`, wired to `useWorkSearch()` (`contracts/ui-interaction.md › Filter bar additions`); make T028 pass.
- [x] T032 [US2] Show `matchCounts` figures in `apps/web/src/feature/projects/components/BoardColumn.tsx` and `apps/web/src/feature/projects/components/TaskListGroup.tsx` headers when search or filters are active, and wire the `no-match` / `only-done-match` reasons in `project/board.tsx`, `project/list.tsx` and `project/timeline.tsx` through `emptyReason`; make T029 pass.
- [x] T033 [US2] Verify `quickstart.md` steps 3, 4 and 5 on `baseline-dev`, including copying a `?q=` URL into a new tab and the accent check.

**Checkpoint**: Search and Mine narrow all three views, survive view switches and links, and never leave a blank view; all tests green.

---

## Phase 5: User Story 3 - Fold phases away and have it remembered (Priority: P2)

**Goal**: One shared folded state per phase across List and Timeline (and Board lanes in US4), header counts when folded, Collapse all / Expand all, drops onto folded headers landing last in the phase's full order, quick-add unfolding its phase.

**Independent Test**: `quickstart.md` step 6.

### Tests for User Story 3

- [x] T034 [P] [US3] Add cases to `apps/web/src/feature/projects/components/TaskList.test.tsx`: a group with `open={false}` renders its header figures and no rows; its header is still a drop target and a keyboard drop on it yields `{ phaseId, afterTaskId: <last id of the full order> }`; Collapse all / Expand all call `collapseAll(ids)` / `expandAll()`; focusing the quick-add of a folded phase through the `n` shortcut calls `toggle` for that phase.
- [x] T035 [P] [US3] Add cases to `apps/web/src/feature/projects/components/Gantt.test.tsx`: with `collapsedPhaseIds` containing a phase, that phase renders its phase row with "(N tasks)" and no task bars; `onTogglePhase` fires from the phase label button; without the props the chart renders as before.
- [x] T036 [P] [US3] Add cases to `apps/web/src/feature/projects/readability.test.tsx`: `isCollapsed` after `toggle` persists across a remount with the same project id and is dropped for a phase id no longer supplied.

### Implementation for User Story 3

- [x] T037 [US3] Make `apps/web/src/feature/projects/components/TaskListGroup.tsx` controlled (`open`, `onOpenChange`, default open) with the header droppable regardless of state and the folded header showing counts; add Collapse all / Expand all buttons and the `n`-unfold behaviour in `apps/web/src/feature/projects/components/TaskList.tsx` wired to `useReadability()` in `apps/web/src/feature/projects/project/list.tsx`; make T034 pass.
- [x] T038 [P] [US3] Add optional `collapsedPhaseIds` and `onTogglePhase` to `apps/web/src/feature/projects/components/Gantt.tsx` (folded phase: phase row only, label gains "(N tasks)", a chevron button toggles) and wire them plus Collapse all / Expand all in `apps/web/src/feature/projects/project/timeline.tsx`; make T035 pass.
- [x] T039 [US3] Verify `quickstart.md` step 6 on `baseline-dev`, including the drop onto a folded header while a search is active.

**Checkpoint**: Folds persist, are shared between List and Timeline, and never block a drop; all tests green.

---

## Phase 6: User Story 4 - Board lanes by phase (Priority: P2)

**Goal**: A "Lanes by phase" Board layout: one foldable lane per phase in plan order with the four status cells, one drop changing phase and status together as one saved move, empty lanes kept, the phase filter narrowing to one lane, the layout remembered per project on the device.

**Independent Test**: `quickstart.md` step 7.

### Tests for User Story 4

- [x] T040 [P] [US4] Add cases to `apps/web/src/feature/projects/dnd/resolve-drop.test.ts`: container ids of the form `cell:<phaseId>:<status>` resolve through a `cellOf(id)` helper to `{ phaseId, status }`, and `resolveDrop` across two cells returns the target cell plus neighbours from that cell's order.
- [x] T041 [P] [US4] Add cases to `apps/web/src/feature/projects/components/Board.test.tsx`: `layout="lanes"` renders one `section` per phase in plan order labelled "<phase> lane" with four cells each, including an empty phase; a keyboard drop from phase 1 / Upcoming into phase 2 / In progress calls `onMove` once with `{ phaseId, status, afterTaskId?, beforeTaskId? }`; the card menu offers "Move to phase"; a folded lane renders its header and counts only; with `search.phase` set only that lane renders; announcements read "… in In progress, Build …".
- [x] T042 [P] [US4] Add cases to `apps/web/src/feature/projects/project/board.test.tsx`: the "Lanes by phase" toggle flips `layout` through `useReadability()` and the choice is read back on remount.

### Implementation for User Story 4

- [x] T043 [P] [US4] Add `cellId(phaseId, status)` / `cellOf(id)` to `apps/web/src/feature/projects/components/BoardColumn.tsx` (the column accepts an optional `phaseId` and uses the cell id when present, plus the `matching`/`total` figures) and make `resolveDrop` consumers accept it; make T040 pass.
- [x] T044 [US4] Create `apps/web/src/feature/projects/components/BoardLane.tsx` (`{ phase, collapsed, counts, onToggle, children }`: foldable header with name and `open · overdue · done · match` figures, a grid of four cells, min-height cells for empty phases).
- [x] T045 [US4] Add the `layout` prop to `apps/web/src/feature/projects/components/Board.tsx`: in lanes mode build containers per `cell:<phaseId>:<status>` from `columnsByStatus` of each phase's tasks, resolve drops to phase and status, extend the card menu with "Move to phase" (`apps/web/src/feature/projects/components/BoardCard.tsx`), extend the announcements with the phase name, respect `isCollapsed` and the phase filter, and keep columns mode byte-for-byte as today; make T041 pass.
- [x] T046 [US4] Add the "Lanes by phase" toggle and Collapse all / Expand all (lanes only) to `apps/web/src/feature/projects/project/work-filters.tsx` for the Board, and pass `layout` from `useReadability()` in `apps/web/src/feature/projects/project/board.tsx`; make T042 pass.
- [x] T047 [US4] Verify `quickstart.md` step 7 on `baseline-dev`, including the single activity entry for a phase-and-status drop and the keyboard path.

**Checkpoint**: Lanes work with pointer, keyboard and menu, fold with the shared state, and remember themselves; all tests green.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility and design review, performance check, docs, full gate, commit and deploy.

- [x] T048 [P] Review the new controls and headers against `contracts/ui-interaction.md` and `.claude/skills/ui-design/SKILL.md`: `aria-pressed` on toggles, `aria-expanded` on fold triggers, folded content removed from the tab order, focus rings, `motion-safe:` transitions, 375 px layout of the filter bar with the new controls; fix findings in `work-filters.tsx`, `SearchBox.tsx`, `TaskListGroup.tsx`, `BoardLane.tsx`, `Gantt.tsx`.
- [x] T049 [P] Timing check (SC-001, SC-003): seed a 300-task project with 200 complete through a throwaway script in the session scratchpad (not in the repo) against `baseline_dev`, open Board and List on `baseline-dev`, confirm open < 2 s and search update < 300 ms after the last key; memoise `visibleTasks` in `apps/web/src/feature/projects/lib.ts` callers and the container maps in `apps/web/src/feature/projects/components/Board.tsx` and `TaskList.tsx` on `[tasks, search, showDone]` if needed; remove the seed.
- [x] T050 [P] Update `README.md` (workspace paragraph: hide done, search and `/`, Mine, folding, lanes) and `specs/011-large-project-readability/quickstart.md` for any step that changed; no other planning docs.
- [x] T051 Run the full gate in the dev containers: `npm test -w apps/api`, `npm run test:e2e -w apps/api`, `npm run schema:generate` (no diff), `npm run codegen -w apps/web && npm test -w apps/web -- --run`, `npx tsc --noEmit` in `apps/web`, `npm run lint`, `npm run format:check`, `npm run build`; walk `quickstart.md` 1–10.
- [ ] T052 Commit on the host as `feat(011): keep large projects readable` including the migration, `apps/api/schema.graphql`, the phase-number URL change and `specs/011-large-project-readability/`; rebuild both images and redeploy `baseline` per `plan.md › Deployment Notes`; confirm the migration applied and the site answers 200.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup → Foundational**: T002 → T003; T004 → T005 (parallel with T002/T003); T006 → T007 after T005; T008 after T003; T009 after T007 and T008; T010 after T008; T011 → T012 after T010; T013 → T014 and T015 → T016 after T012 (T016 needs T014); T017 after T012.
- **US1 (Hide done)** needs all of Phase 2.
- **US2 (Search)** needs Phase 2; independent of US1 except `work-filters.tsx` (T022 then T031 sequentially) and `EmptyWork` (T021 first).
- **US3 (Folding)** needs Phase 2 (`useReadability()`); independent of US1/US2 except `TaskList.tsx`/`TaskListGroup.tsx` (T024, T032, then T037 sequentially).
- **US4 (Lanes)** needs Phase 2 and US3 (`isCollapsed`); `Board.tsx` edits follow T023 and T032.
- **Polish** after the stories you ship.

### Files touched by several stories (edit sequentially)

- `apps/web/src/feature/projects/project/work-filters.tsx`: T022, T031, T046.
- `apps/web/src/feature/projects/components/Board.tsx` / `BoardColumn.tsx`: T023, T032, T043, T045.
- `apps/web/src/feature/projects/components/TaskList.tsx` / `TaskListGroup.tsx`: T024, T032, T037.
- `apps/web/src/feature/projects/project/board.tsx`: T012, T023, T032, T046.
- `apps/web/src/feature/projects/lib.ts` / `lib.test.ts`: T011, T012, T017.
- `apps/api/test/workspace.e2e-spec.ts`: T009 only.

### Parallel Opportunities

- Phase 2: T004/T005 alongside T002/T003; T008 alongside T006/T007; T013/T014 alongside T015/T016 after T012.
- US1: T018 + T019 + T020; T021 alongside T022; T025 alongside T023/T024.
- US2: T027 + T028 + T029; T030 alongside T032's test prep; T031 after T030.
- US3: T034 + T035 + T036; T038 alongside T037.
- US4: T040 + T041 + T042; T043 + T044 together; T045 after both; T046 after T045.
- Polish: T048 + T049 + T050 together.

## Parallel Example: User Story 1

```bash
# Tests first:
Task: "EmptyWork.test.tsx: three reasons and actions"                        (T018)
Task: "board.test.tsx: hidden done, recent window, toggle, precedence"        (T019)
Task: "TaskList.test.tsx: done figures, full-order neighbours"                (T020)

# Then:
Task: "EmptyWork.tsx"                                                         (T021)
Task: "work-filters.tsx: Show done toggle"                                    (T022)
# board.tsx + BoardColumn (T023) and list.tsx + TaskList (T024) after T021/T022; timeline (T025) alongside.
```

## Implementation Strategy

### MVP First (Phases 1–3)

1. Setup and Foundational: `completedAt`, search schema, preference keys, provider, visibility pipeline.
2. US1 Hide done. **Stop and validate** with `quickstart.md` 1–2. Deploy and demo: a mature project opens on its open work.

### Incremental Delivery

3. US2 Search and Mine.
4. US3 Folding across List and Timeline.
5. US4 Board lanes.
6. Polish, full gate, commit and deploy.

## Notes

- The only stored schema change is `ProjectTask.completedAt`; every other behaviour is client-side state and pure functions.
- Neighbours for every drop come from the full manual order, never the visible subset (`research.md › Decision 6`); the US1 and US3 tests pin this.
