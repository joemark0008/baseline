# Implementation Plan: Keep Large Projects Readable

**Branch**: `011-large-project-readability` | **Date**: 2026-11-27 | **Spec**: `specs/011-large-project-readability/spec.md`

**Input**: Feature specification from `/specs/011-large-project-readability/spec.md`

## Summary

The three work views stay readable as a project accumulates tasks: completed work is hidden by
default (with a seven-day "recent" window in the Board's Complete column and visible hidden
counts), a search box and a "Mine" switch join the shared filters, phases fold with one shared
state across List, Timeline and Board, and the Board gains an optional lane-per-phase layout
where one drop changes phase and status together. Server-side the change is one nullable
timestamp, `ProjectTask.completedAt`, written at the status transition (research.md ›
Decision 1); everything else is client-side: a `visibleTasks` pipeline in `lib.ts`, three new
keys in the per-device view preference, a `useReadability()` hook, a `BoardLane` component and
small extensions to the filter bar, the List group, the Gantt and the Board.

## Technical Context

**Language/Version**: TypeScript 6 on Node.js 22; NestJS 12, React 19

**Primary Dependencies**: Existing stack only. `@dnd-kit/*` as pinned by 010; shadcn `input`, `collapsible`, `badge`, `button`, `tooltip` already in `src/components/ui/`. No new packages (research.md › Decision 10 rejects virtualisation for this feature).

**Storage**: PostgreSQL 16 (shared instance). One migration: `project_task.completedAt TIMESTAMP NULL`, backfilled from `updatedAt` for rows already `COMPLETE`. See `data-model.md`.

**Testing**: API unit specs with the fake `PrismaService` (`completionStamp`, `update`, `move`, `create`), `apps/api/test/workspace.e2e-spec.ts` extended against `DATABASE_URL`; web Vitest + Testing Library for the pure pipeline (`visibleTasks`, `normaliseText`, `emptyReason`, `matchCounts`), the preference round-trip, the search box debounce and Escape, folded-group drops, lanes drops, Gantt folded rows and the empty states.

**Target Platform**: The two existing containers; no new env vars. Node and npm run inside the dev containers on the server.

**Project Type**: Web application (api + web)

**Performance Goals**: Board and List open in under 2 s with 300 tasks (SC-001); search reflects the last keystroke within 300 ms at 500 tasks (SC-003). Achieved by hiding done work by default, memoising the visible set and container maps, and debouncing the URL write (research.md › Decisions 3, 10).

**Constraints**: Readability settings are per device and never on the server (FR-003, FR-013, FR-016); search is shareable in the URL (FR-007); precedence rules of FR-004 live in one pure function; every drag keeps its keyboard and menu equivalent and records one activity row (FR-017, FR-019); counts elsewhere never change (FR-020); neighbours for a drop come from the full manual order, not the visible subset (research.md › Decision 6).

**Scale/Scope**: Up to 1,000 tasks per project; one stored field, one GraphQL field, three work views, one filter bar, one new Board layout, three preference keys.

## Constitution Check

- **I. Single Responsibility**: `completionStamp` (one function) owns the completedAt rule and is called by `create`, `update` and `move`; `visibleTasks` owns hide/filter/search precedence; `emptyReason` owns the empty-state choice; `view-preferences.ts` owns persistence; `useReadability()` owns reading and writing fold/done/layout state; `BoardLane` renders a lane; `SearchBox` renders and debounces the search. No component both decides visibility and renders it.
- **II. Open/Closed**: `applyWorkFilters` is replaced by `visibleTasks`, which composes small predicates so a new filter is one more predicate; `Board` gains a `layout` prop and lanes are a new container-id scheme over the same drop resolver; `Gantt` gains optional `collapsedPhaseIds`/`onTogglePhase` (absent = today's behaviour, existing tests hold); `TaskListGroup` becomes controlled with `open`/`onOpenChange` defaulting to open. `TasksService.update`/`move` call the stamp helper instead of growing inline branches.
- **III. Liskov Substitution**: No new interface with multiple implementations.
- **IV. Interface Segregation**: `SearchBox` takes `{ value, onChange, onClear }`; `BoardLane` takes `{ phase, cells, collapsed, counts, onToggle, children }`; `EmptyWork` takes `{ reason, hiddenDone, onShowDone, onClear }`; `useReadability()` returns only the five operations the views use.
- **V. Dependency Inversion**: The completion rule is in the service, not the resolver; the web reads `completedAt` from the API rather than inferring it; views call generated operations through the existing hooks; nothing imports storage directly except `view-preferences.ts`.
- **Technology Stack**: Prisma migration committed; `schema.graphql` regenerated; generated documents only; route `validateSearch` extended for `q` and `mine`; shadcn primitives only; no new resolver, so the permission surface is unchanged.
- **Simplicity**: No new library, no server-side preferences, no server search, no virtualisation; one timestamp instead of deriving completion from activity.
- **Design before code**: files and responsibilities listed below.
- **Tests**: Red-green per story; e2e covers the timestamp transitions; web tests cover precedence, counts, folds, lanes and empty states.

**Gate result (pre-research)**: Pass. **Gate result (post-design)**: Pass; no deviations, Complexity Tracking is empty.

## Permission model

Unchanged (FR-019). No new operations; `completedAt` is read-only and derived from status
changes that are already permission-checked. Readability settings are local to the device and
need no permission.

## Project Structure

### Documentation (this feature)

```text
specs/011-large-project-readability/
├── spec.md
├── plan.md                       # this file
├── research.md                   # decisions 1–10
├── data-model.md                 # completedAt, preference keys, derived values, container ids
├── contracts/graphql.md          # ProjectTask.completedAt and the transition rules
├── contracts/ui-interaction.md   # filter bar, headers, folding, lanes, empty states
├── quickstart.md
└── tasks.md                      # /speckit-tasks output (not created here)
```

### Source Code

```text
apps/api/prisma/schema/projects.prisma                    ProjectTask.completedAt DateTime?
apps/api/prisma/migrations/<ts>_add_task_completed_at/    column + backfill
apps/api/src/feature/projects/
├── completion.ts (+spec)                                  completionStamp(prev, next, now)
├── entities/project.entity.ts                             ProjectTask.completedAt
├── mappers.ts (+spec)                                     toTask copies completedAt
├── tasks.service.ts (+spec)                               create/update/move apply the stamp
apps/api/test/workspace.e2e-spec.ts                        completedAt set, cleared, backfill invariant
apps/api/schema.graphql                                    regenerated
apps/web/src/feature/projects/
├── operations.ts                                          PROJECT, PROJECT_TASK select completedAt
├── lib.ts (+test)                                         WorkSearch q/mine; normaliseText, isRecentlyDone, visibleTasks, doneCountByPhase, hiddenDoneCount, matchCounts, emptyReason
├── view-preferences.ts (+test)                            showDone, collapsed, boardLayout
├── readability.tsx (+test)                                ReadabilityProvider + useReadability() (showDone, layout, isCollapsed, toggle, collapseAll, expandAll)
├── project/work-search.ts                                 validateSearch accepts q, mine
├── project/work-filters.tsx (+test)                       SearchBox, Mine, Show done, Lanes (Board), Collapse/Expand all
├── project/layout.tsx                                     wraps Outlet in ReadabilityProvider; writes the extended preference
├── project/board.tsx, list.tsx, timeline.tsx              use visibleTasks with the signed-in user id; pass fold/layout props; render EmptyWork
├── components/SearchBox.tsx (+test)                        debounced input, Escape, clear, `/` focus
├── components/EmptyWork.tsx (+test)                        three empty states
├── components/Board.tsx (+test)                            layout prop; lanes container ids; drop → phase+status; card menu "Move to phase"
├── components/BoardLane.tsx                                foldable lane with four BoardColumn cells and counts
├── components/BoardColumn.tsx                              optional phaseId in the container id; matching/total/done figures
├── components/BoardCard.tsx                                menu gains "Move to phase" when lanes are on
├── components/TaskList.tsx (+test)                         full-order neighbours; folded groups; counts; Collapse/Expand all
├── components/TaskListGroup.tsx                            controlled open; header counts (open, overdue, done, match); droppable when folded
├── components/Gantt.tsx (+test)                            collapsedPhaseIds, onTogglePhase; folded phase renders its row only
apps/web/src/routes/_protected/projects/$id.tsx            validateSearch (q, mine)
README.md                                                  workspace paragraph: hide done, search, folding, lanes
```

**Structure Decision**: The visibility pipeline and counts are pure functions in `lib.ts` so
Board, List and Timeline share one set of rules and tests. Per-device state stays in
`view-preferences.ts` behind a provider so the views never touch storage. Lanes extend the
existing `Board` rather than duplicating it, because the 010 drop resolver already handles
arbitrary container ids and the move mutation already takes phase and status together.

## Module wiring

- No new Nest modules or providers. `completion.ts` is a pure helper imported by
  `TasksService`.
- Web: `ProjectLayout` renders `ReadabilityProvider` (keyed by project id) inside
  `ProjectContext.Provider`; views call `useReadability()` and `useWorkSearch()`; the signed-in
  user id for "Mine" comes from the existing `useCurrentUser()` hook.

## Deployment Notes

- `prisma migrate deploy` applies the `completedAt` backfill on the next deploy of `baseline`
  and the next restart of `baseline-dev`.
- No package changes; rebuild both images and redeploy `baseline`; `baseline-dev` picks the
  code up live.

## Complexity Tracking

No deviations from the constitution; nothing to justify.
