# Data Model: Keep Large Projects Readable (feature 011)

One stored field changes. Everything else is client-side state or derived.

## Changed model

### ProjectTask (apps/api/prisma/schema/projects.prisma)

| Field         | Type        | Rule                                                                                                             |
| ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `completedAt` | `DateTime?` | Set to `now()` when `status` transitions to `COMPLETE`; set to `null` when it leaves `COMPLETE`; never user-set. |

- Migration `add_task_completed_at`: add the nullable column, then
  `UPDATE "project_task" SET "completedAt" = "updatedAt" WHERE "status" = 'COMPLETE'`.
- Written only by `TasksService.update` and `TasksService.move`, through one helper
  `completionStamp(previousStatus, nextStatus, now)` returning `{ completedAt: Date | null }`
  or `{}` when the status does not cross the `COMPLETE` boundary.
- Exposed as `ProjectTask.completedAt: DateTime` (nullable) in GraphQL; `toTask` copies it.
- Invariant: `completedAt != null` ⇔ `status = COMPLETE` for every row written after the
  migration; the backfill establishes it for existing rows.

## Client-only state (localStorage, per project, per device)

### ViewPreference (apps/web/src/feature/projects/view-preferences.ts), extended

| Field         | Type                        | Default   | Rule                                                        |
| ------------- | --------------------------- | --------- | ----------------------------------------------------------- |
| `view`        | `board \| list \| timeline` | `board`   | unchanged (010)                                             |
| `search`      | `WorkSearch`                | `{}`      | unchanged, now includes `q` and `mine`; `task` never stored |
| `showDone`    | `boolean`                   | `false`   | FR-003                                                      |
| `collapsed`   | `string[]` (phase ids)      | `[]`      | FR-013; ids not in the project's phases are dropped on read |
| `boardLayout` | `columns \| lanes`          | `columns` | FR-016                                                      |

Unknown or malformed values fall back to the defaults, as today.

### WorkSearch (apps/web/src/feature/projects/lib.ts), extended

| Key    | Type     | Validation                                                          |
| ------ | -------- | ------------------------------------------------------------------- |
| `q`    | `string` | trimmed; dropped when empty; at most 100 characters (longer is cut) |
| `mine` | `true`   | present only when on (`?mine=true`); any other value is dropped     |

Existing keys (`phase` as plan number, `owner`, `status`, `overdue`, `department`, `sort`,
`task`) are unchanged.

## Derived values (client, pure functions in lib.ts)

- `isRecentlyDone(task, now)`: `status = COMPLETE` and `completedAt` within the last 7 × 24 h.
- `visibleTasks(tasks, ctx)`, `ctx = { search, phases, userId, showDone, now }`:
  1. If not `showDone` and `search.status !== 'COMPLETE'`: drop tasks with `status = COMPLETE`
     unless `isRecentlyDone` **and the consumer is the Board** (the List and Timeline drop all
     done tasks), or `task.id === search.task`.
  2. Apply phase (by plan number), owner, status, overdue.
  3. Apply `mine` (owner id equals `userId`) and `q` (normalised substring of title or owner
     name).
     The Board/List difference is a `recentDoneVisible: boolean` flag in `ctx`.
- `doneCountByPhase(tasks)` and `hiddenDoneCount(tasks, visible)`: the "N done" figures.
- `matchCounts(visible, total)`: per container `{ matching, total }` for headers.
- `emptyReason(tasks, visible, search, showDone)`: `'none' | 'all-done' | 'no-match' |
'only-done-match'`.
- `normaliseText(s)`: NFD, strip combining marks, lower-case, trim.

## Container ids (dnd, client)

| Surface        | Container id              | Resolves to                                      |
| -------------- | ------------------------- | ------------------------------------------------ |
| Board, columns | `column:<status>`         | status (unchanged)                               |
| Board, lanes   | `cell:<phaseId>:<status>` | phase and status                                 |
| List group     | `phase:<phaseId>`         | phase (unchanged); folded header still droppable |
| Readiness      | `dphase:<phaseId>`        | unchanged                                        |

Neighbours for a drop are always computed from the phase's or column's **full** manual order
(all tasks, hidden ones included), never from the visible subset.

## Unchanged

Permissions, `position`, move rules, activity recording, the no-op rule and every count on the
project header, project card and Overview (FR-019, FR-020).
