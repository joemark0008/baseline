# Contract: Drag-and-drop interaction (feature 010)

What every draggable surface guarantees, so the three views and the two plan lists behave alike.
Library: `@dnd-kit` (research.md › Decision 1). Shared code: `apps/web/src/feature/projects/dnd/`.

## Sensors (shared `useWorkSensors()`)

| Sensor         | Activation                            | Purpose                      |
| -------------- | ------------------------------------- | ---------------------------- |
| PointerSensor  | distance 6 px                         | mouse / pen; ignores clicks  |
| TouchSensor    | delay 250 ms, tolerance 8 px          | press-and-hold; scroll stays |
| KeyboardSensor | `sortableKeyboardCoordinates` (lists) | keyboard sorting             |

## Keyboard map

| Surface                                             | Keys                                                                                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board card / List row / Phase row / Deliverable row | `Space` or `Enter` picks up; `↑ ↓ ← →` moves between positions and containers; `Space`/`Enter` drops; `Escape` cancels                                |
| Timeline bar                                        | focus bar; `← →` shift 1 day; `Shift+← →` shift 7 days; `Alt+← →` resize due date; `Alt+Shift+← →` resize start date; `Enter` saves; `Escape` cancels |
| Any view                                            | `n` focuses the view's quick-add (not while typing, not while a dialog is open)                                                                       |

Every row/card menu also offers the non-pointer equivalents: Board card → "Move to <column>",
"Move up/down"; List row → "Move to phase…", "Move up/down"; Phase row → "Move up/down";
Deliverable row → "Move to phase…", "Move up/down"; Timeline bar → "Shift ±1 day/±1 week" in
the task detail. (FR-009)

## Announcements (`dnd/announcements.ts`, live region)

- Pick up: `Picked up task "<title>" in <column|phase>, position <i> of <n>.`
- Over: `Task "<title>" is over <column|phase>, position <i> of <n>.`
- Drop: `Task "<title>" moved to <column|phase>, position <i> of <n>.`
- Cancel: `Move cancelled. Task "<title>" returned to <column|phase>, position <i> of <n>.`
- Timeline: `Task "<title>" now <start> to <due>.` while shifting; `Saved.` / `Cancelled.`

## Feedback and outcome

- Drop target highlighted while hovering; `DragOverlay` shows the card/row at reduced opacity.
- Drop that changes nothing: no request, no announcement beyond "returned to".
- Optimistic: the item renders in its new place immediately; a failed save returns it and shows a
  destructive toast with the server message; a successful save shows no toast (status, phase and
  date changes are visible), except timeline saves which announce `Saved.`
- Reduced motion: `dropAnimation={null}`, transitions under `motion-safe:` only.
- Phase bars and phase rows render without handles and without draggable attributes for Members.

## Timeline geometry (`lib.ts`)

- `dayWidth` = month column width ÷ days in that month (existing `monthWidth`), rounded per month.
- `deltaToDays(deltaPx, dayWidth)` = `Math.round(deltaPx / dayWidth)`.
- `shiftDates({ startDate, dueDate }, days)` moves both when present, due only when start is null.
- `resizeDate(task, edge, days)` changes one date; the result is validated by the server.
