# Research: Project Management Workspace Redesign with Drag and Drop

## Decision 1: Drag and drop library — `@dnd-kit/core` 6.3.x line, pinned

- **Decision**: Add `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/modifiers@9.0.0`
  and `@dnd-kit/utilities@3.2.2` to `apps/web`. One `DndContext` per view, `useSortable` for
  cards, rows, phases and deliverables, `useDraggable` for timeline bars, `DragOverlay` for the
  dragged preview, `PointerSensor` + `TouchSensor` (250 ms press delay) + `KeyboardSensor`.
- **Rationale**: The spec requires keyboard and screen-reader equivalents for every drag (FR-009),
  touch with press-and-hold (FR-012) and free horizontal drags on the timeline (FR-007). dnd-kit
  ships keyboard sorting, live-region announcements, focus restoration, touch activation
  constraints and axis modifiers, so none of that is hand-written. Registry check on
  2026-11-27: `@dnd-kit/core` 6.3.1 declares `react >=16.8.0` and works on React 19;
  `@dnd-kit/sortable` 10.0.0 and `@dnd-kit/modifiers` 9.0.0 peer on core `^6.3.0`. Adding a
  library is not a stack substitution under the constitution; the pinned majors are unchanged.
- **Alternatives considered**: `@dnd-kit/react` 0.5.3 (the rewrite; pre-1.0 API, rejected until
  stable); `@hello-pangea/dnd` 18.0.1 (sortable lists only, no free drag for timeline bars, DOM
  layout constraints); hand-rolled pointer events (weeks of accessibility work the library
  already covers; contradicts "use what the stack provides").

## Decision 2: One float `position` per task, server-computed from neighbours

- **Decision**: `ProjectTask.position: Float` ordered within the project. A move sends the ids
  of the intended neighbours (`afterTaskId`, `beforeTaskId`) with the target status or phase;
  the service places the task at the midpoint, or at `max + 1` / `min − 1` at the ends, and
  renumbers the whole project (1, 2, 3 …) inside the same transaction when the gap drops below
  `1e-6`. New tasks get `max + 1`. The migration backfills `position` from creation order.
- **Rationale**: FR-005: one order that both Board (within a column) and List (within a phase)
  respect, so filtered or grouped views never disagree. Midpoint insertion is one row update per
  drop; renumbering is rare and bounded by a few hundred rows. Sending neighbours rather than an
  index keeps the rule server-side and tolerant of concurrent edits (the service re-reads the
  neighbours' current positions).
- **Alternatives considered**: Integer `order` renumbered on every move (N updates per drop);
  lexicographic string ranks (more code, same effect); separate order per status column (two
  orders that drift apart, rejected by the spec).

## Decision 3: Timeline drags reuse `updateProjectTask` / `updateProjectPhase`

- **Decision**: The web converts the pixel delta to whole days (`deltaToDays`), applies
  `shiftDates` (both dates by the same days) or `resizeDate` (one edge) and calls the existing
  update mutations. The server's existing date-range validation refuses `due < start`; a
  predecessor conflict is a server-computed `ProjectTask.predecessorConflict` flag shown as a
  warning (FR-019).
- **Rationale**: No new rule exists on the server; a shift is a presentation gesture over the
  same fields the dialog edits. Keyboard shifting (arrow keys) calls the same functions.
- **Alternatives considered**: A `shiftProjectTask(id, days)` mutation (duplicates validation
  for no new rule); client-side conflict detection (rule would live in the web, forbidden).

## Decision 4: Shared work filters are route search params; view and filters remembered per device

- **Decision**: The project route (`/_protected/projects/$id`) declares `validateSearch` for
  `{ phase?, owner?, status?, overdue?, department?, sort? }`; Board, List and Timeline read the
  same search and links between views carry it. `lib/view-preferences.ts` stores
  `{ view, search }` per project id in `localStorage` (try/catch, silent when unavailable) and
  `/projects/$id/work` redirects to the remembered view with its search (FR-015).
- **Rationale**: Constitution: search-param schemas are declared on the route, not in components;
  URLs with filters are shareable; the preference is a per-device convenience, so browser
  storage is the right place and no server state is needed.
- **Alternatives considered**: React context for filters (lost on reload, not shareable); a
  server-side preference table (synchronised across devices, which the spec rules out).

## Decision 5: Optimistic moves through a local override map, not cache surgery

- **Decision**: `useOptimisticMoves()` keeps a map `taskId → { status?, phaseId?, position? }`
  applied on top of the project data while the move mutation is in flight; on success the
  refetched project replaces it, on error the entry is dropped and a toast shows the server's
  message (FR-010). The same hook serves Board and List.
- **Rationale**: The `PROJECT` query is nested (phases → tasks); rewriting Apollo's normalised
  cache for a cross-phase move is fragile. An override map is a few lines, testable as a pure
  reducer, and matches the "refetch `PROJECT` after mutations" convention of feature 007.
- **Alternatives considered**: Apollo `optimisticResponse` + cache `update` (correct but
  intricate for nested lists); no optimism (a visible lag on every drop, fails SC-006).

## Decision 6: No-op drops are filtered on both sides

- **Decision**: The web does not call a mutation when the drop target equals the origin
  (same column/group and same neighbours; zero-day shift). The service additionally returns the
  task unchanged, without an activity row, when the computed status, phase and position are
  equal to the current ones (FR-013).
- **Rationale**: Activity history must not fill with "reordered" rows from accidental drops; the
  server rule is the one that counts, the client check avoids the round trip.

## Decision 7: Views are new routes; the Tasks table route redirects to List

- **Decision**: New routes `/projects/$id/board`, `/projects/$id/list`, `/projects/$id/work`
  (redirect). `/projects/$id/tasks` stays as a one-line redirect to `/list` so bookmarks keep
  working; the table component is removed. `/projects/$id/timeline` keeps its path and gains
  interaction.
- **Rationale**: File-based routes, one component per view, no conditional rendering of three
  views inside one route; old links do not 404.

## Decision 8: Project header and navigation layout

- **Decision**: `ProjectLayout` renders a compact header (name, hospital, status, progress bar,
  overdue count, target go-live, Edit for Managers), then a two-group navigation: **Work**
  (Board, List, Timeline, as segmented buttons carrying the shared search) and **Pages**
  (Overview, Readiness, Org chart, Team, Stakeholders, Activity). The four summary cards are
  replaced by the header strip; Overview keeps the phase plan and what-is-due-next.
- **Rationale**: FR-001, US5 scenario 1; the stat cards consumed a screen of height before the
  work was visible. Everything stays shadcn (`Progress`, `Badge`, `Button`, `Tabs`-like segmented
  group built from `Button` variants as the existing TABS do).

## Decision 9: Timeline interaction model

- **Decision**: `Gantt` gains optional `onTaskDatesChange(taskId, { startDate, dueDate })` and
  `onPhaseDatesChange(phaseId, …)` props; when present, bars render as `useDraggable` elements
  with a body handle (shift) and two edge handles (resize), constrained to the horizontal axis,
  snapping to `dayWidth`. A tooltip shows the dates while dragging; release calls the callback;
  Escape cancels. A bar with only a due date drags the due date alone. Focused bars accept
  `←`/`→` (1 day), `Shift+←/→` (7 days), `Enter` to save, `Escape` to cancel. The chart window
  extends when a bar is dragged beyond it.
- **Rationale**: US3 scenarios 1–7 with the smallest change to the existing renderer; absent
  callbacks keep the chart read-only (Members on phase bars).

## Decision 10: Inline editing in the List and the task side panel

- **Decision**: `TaskListRow` edits status, priority (native `Select`), owner (`PersonSelect`)
  and due date (`Input type=date`) in place and saves on change through `updateProjectTask`;
  the `TaskDetailSheet` gains the same inline editors for every field plus description and
  phase, and a per-task activity list from `projectActivity(projectId, targetId)` (new optional
  argument).
- **Rationale**: US2 scenario 4, US5 scenario 2. The same mutation and validation as the dialog;
  the dialog stays for creation with all fields.

## Decision 11: Projects list as cards with "my open tasks" and sort

- **Decision**: `ProjectListItem` gains `myOpenTasks: Int!` (count of the caller's not-complete
  tasks, computed in `listMine`), and `projects(page, perPage, sort: ProjectsSort = RECENT)`
  accepts `RECENT | GO_LIVE`. The list page renders `ProjectCard`s in a responsive grid with a
  sort toggle.
- **Rationale**: FR-016; counts come from the server in the same query (no N+1: Prisma filtered
  `_count`).

## Decision 12: Keyboard shortcut and reduced motion

- **Decision**: A small `useShortcut('n', handler)` hook ignores events whose target is an
  input, textarea, select or contenteditable, and when a dialog is open; it focuses the current
  view's quick-add. `DragOverlay` gets `dropAnimation={null}` and transitions use
  `motion-safe:` when `prefers-reduced-motion` is set.
- **Rationale**: FR-017, FR-012.
