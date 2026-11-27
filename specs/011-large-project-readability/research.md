# Research: Keep Large Projects Readable (feature 011)

All unknowns from the Technical Context are resolved below. No new dependency is needed.

## Decision 1: "Recently completed" needs a stored `completedAt` on the task

**Decision**: Add `ProjectTask.completedAt DateTime?`, set by the service whenever a task's status
becomes `COMPLETE` (through `update` or `move`) and cleared when it leaves `COMPLETE`. Backfill
existing complete tasks with their `updatedAt`. Expose it as `ProjectTask.completedAt` in GraphQL.

**Rationale**: FR-001 keeps tasks completed in the last seven days visible. `updatedAt` is not a
usable proxy: editing a title or a comment would make an old completion "recent" again, and a
task completed long ago but touched today would reappear. One nullable timestamp written at the
status transition is the smallest faithful record, and it also gives Activity and future reports
a true completion date.

**Alternatives considered**: deriving the time from the activity log (expensive join per task,
and activity summaries are free text); hiding all complete tasks with no window (spec rejects
it: a card dragged to Complete must stay visible, FR-005).

## Decision 2: Readability state lives in the per-device view preference, not the URL

**Decision**: `showDone`, `collapsed` (set of phase ids) and `boardLayout` (`columns` | `lanes`)
extend the existing `ViewPreference` record in `view-preferences.ts` (localStorage key
`baseline.project-view.<projectId>`). They are read once into a small context provided by
`ProjectLayout` and written on change. They are **not** route search params.

**Rationale**: FR-003, FR-013 and FR-016 say "per person, per project, on the same device" and
"not shared", which is exactly what the view preference already is. Putting them in the URL
would make every copied link carry someone's fold state and would fight FR-007 (search text is
meant to be shareable, folds are not). The preference file already tolerates missing or corrupt
storage.

**Alternatives considered**: server-side preferences (out of scope by Assumptions; adds a
mutation and a table for a convenience); React state only (lost on reload, fails SC-004).

## Decision 3: Search text and "mine" are shared filters in the route search

**Decision**: `WorkSearch` gains `q?: string` (trimmed, max 100 characters) and `mine?: true`.
`parseWorkSearch` validates them like the other keys. `applyWorkFilters` gains the signed-in
user's id for `mine` and matches `q` against title and owner name after folding case and accents
(`normalize('NFD')` plus stripping combining marks, then `toLowerCase`). The search input is
debounced 150 ms before it writes to the URL; the input keeps its own immediate state so typing
never lags.

**Rationale**: FR-007 wants search to carry across views and be copyable; the route search is
already the mechanism for that and is remembered by the view preference. Client-side matching is
enough because the three views already hold every task of the project; a server search would add
a round trip per keystroke for no gain at the stated scale (≤1,000 tasks, SC-003).

**Alternatives considered**: a `search` argument on `projectTasks` (adds latency, loses the
optimistic move overlay, and the composed `project` query would still fetch everything);
fuzzy matching (surprising for short hospital-specific codes like "ADT"; substring is
predictable).

## Decision 4: Hidden done tasks are filtered in one place, with the window computed client-side

**Decision**: A pure `visibleTasks(tasks, { search, phases, userId, showDone, now })` in
`lib.ts` applies, in order: hide done (unless `showDone`, or `search.status === 'COMPLETE'`, or
the task id equals `search.task`), then the existing filters, then `q` and `mine`. A done task is
"recent" when `completedAt` is within seven days of `now`. The Board's Complete column receives
the recent completions when hiding; the List drops all done tasks from its groups and shows
"N done" per phase from a separate `doneCountByPhase` helper. `now` is passed in so tests are
deterministic.

**Rationale**: One function keeps FR-004's precedence rules (status filter wins; opened task is
revealed) testable and identical across Board, List and Timeline. Counting hidden tasks from the
same input guarantees FR-020 (counts never drift from data).

**Alternatives considered**: filtering inside each view (three copies of the precedence rules);
excluding done tasks in the GraphQL query (breaks the Complete column and project counts).

## Decision 5: One folded-phase set, shared by List groups, Timeline phases and Board lanes

**Decision**: `collapsed: string[]` in the preference, exposed by a `useReadability()` hook as
`{ isCollapsed(phaseId), toggle(phaseId), collapseAll(ids), expandAll() }`. `TaskListGroup`
becomes controlled (`open` from the hook instead of local state). `Gantt` gains an optional
`collapsedPhaseIds` prop and `onTogglePhase` callback; a collapsed phase renders its phase row
only. Board lanes use the same hook. Stale ids are dropped on read by intersecting with the
project's phases.

**Rationale**: FR-011 demands one state across the three views; a single array in one record is
the simplest shape that survives reload (FR-013) and ignores removed phases.

**Alternatives considered**: per-view fold state (violates FR-011); a `collapsed` flag on the
phase in the database (shared across people, which the spec forbids).

## Decision 6: Drops on a folded group or lane target the phase's full order

**Decision**: A folded `TaskListGroup` keeps its `useDroppable` header; `resolveDrop` already
treats a container id as "append to end", so dropping on a folded header moves the task last.
The neighbours are computed from the unfiltered, unfolded order of that phase (`source` built
from all tasks, not the visible subset), so FR-015 and the edge case "folded phase while a
search is active" hold. The same applies to Board lanes: a lane cell is a droppable even when
the lane is folded (the header spans the four statuses).

**Rationale**: Reuses the 010 drop resolver unchanged. Computing neighbours from the full order
prevents a filtered view from placing a task in the middle of hidden tasks.

**Alternatives considered**: refusing drops on folded phases (worse than the spec asks); unfolding
on hover (surprising, moves the layout under the pointer).

## Decision 7: Board lanes are a layout of the same Board, not a new component tree

**Decision**: `Board` takes `layout: 'columns' | 'lanes'`. In lanes mode, the container map keys
become `cell:<phaseId>:<status>` and the containers are built per phase from `columnsByStatus`
of that phase's tasks. A drop resolves to `{ phaseId, status, neighbours }`, which maps directly
onto the existing `MoveTaskInput` (status + phaseId + neighbours), so one mutation call records
one activity row (FR-017). `BoardColumn` is reused as the cell; a new `BoardLane` wraps four cells
with a foldable header and counts. The DragOverlay, sensors, announcements and keyboard map are
unchanged; announcements name "In progress in Build" when lanes are on.

**Rationale**: `TasksService.move` already accepts status and phase together and writes one row,
so lanes need no API change. Keeping one `Board` keeps the keyboard and menu equivalents
(FR-017) in one place: the card menu gains "Move to phase" when lanes are on.

**Alternatives considered**: a separate `LaneBoard` (duplicates the drag logic, two keyboard
maps to keep in sync); lanes as nested DndContexts (dnd-kit does not support cross-context drags).

## Decision 8: Counts and "no matches" states

**Decision**: Column, group and lane headers show `matching` (visible count) and, when search or
filters are active, `of total`; the hidden-done count shows as "N done" with the toggle. A view
whose visible set is empty shows one `EmptyWork` component with the right message: "All done"
(no open tasks and nothing hidden by filters), "No tasks match" with a Clear button (filters
active), or "N completed tasks match. Show done" (only hidden done tasks match). The decision
between the three is a pure `emptyReason()` in `lib.ts`.

**Rationale**: FR-009 and the edge cases describe three distinct empty states; a pure classifier
keeps them testable and consistent across views.

## Decision 9: Search input, shortcuts and Escape

**Decision**: The search box is a shadcn `Input` with `type="search"`, `aria-label="Search
tasks"`, a clear button, and an Escape handler that clears it. It is an `INPUT`, so the existing
`shortcutsSuspended` already silences `n` while typing (FR-010). A `/` shortcut focuses the box,
registered with the existing `useShortcut`.

**Rationale**: Reuses the 010 shortcut rules exactly; `/` is the conventional search key.

## Decision 10: Performance at 500 tasks without virtualisation

**Decision**: No virtualisation. Hiding done tasks by default removes the bulk of a mature
project's rows; `visibleTasks` and the container maps are memoised on `[tasks, search,
showDone]`; the search debounce keeps re-renders to one per 150 ms. Board cards and List rows
are already memo-friendly (props are the task row and callbacks). The quickstart includes a
500-task timing check against SC-001 and SC-003; if the List misses 2 s, the follow-up is
`@tanstack/react-virtual`, kept out of this feature.

**Rationale**: Assumptions cap the target at 1,000 tasks; the 010 measurements (300 tasks under
400 ms server-side) and the default hiding make virtualisation unnecessary for this feature.
