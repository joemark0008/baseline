# Quickstart: Project Management Workspace Redesign with Drag and Drop

## Run

Sign in at https://baseline-dev.joemarkgimeno.com (live dev) or locally with `npm run dev:api`
and `npm run dev:web`. Node runs inside the dev container on the server (`docker exec -it
web-<service-uuid> sh`); the new `@dnd-kit` packages are installed there and the lockfile is
committed. Design details: `data-model.md`, `contracts/graphql.md`, `contracts/ui-interaction.md`.

## Validate end to end

1. **Header and views** (US5): open a project. The header shows name, hospital, status, progress,
   overdue count and go-live; the Work switcher offers Board, List, Timeline; Pages lists
   Overview, Readiness, Org chart, Team, Stakeholders, Activity. `/projects/<id>/tasks` redirects
   to the List.
2. **Board drag** (US1): drag a card from Upcoming to In progress: it stays there, no dialog,
   Activity shows "moved task … to In progress". Drag a card above another in the same column,
   reload: the order persists. Switch off the network (devtools), drag again: the card snaps
   back and a toast explains. Drop a card where it was: nothing is recorded.
3. **Board keyboard** (US1): Tab to a card, press Space, use arrow keys to another column,
   press Space: same result as dragging; a screen reader (or the live region in devtools)
   announces pick-up, movement and drop. The card menu offers "Move to Blocked".
4. **Filters** (US1): set Owner and Overdue; only matching cards show; dragging still works.
   The URL carries the filters; switching to List keeps them.
5. **Touch** (US1): on a phone or device emulation, scrolling never drags; press and hold does.
   Columns scroll horizontally at 375 px.
6. **List** (US2): groups by phase with counts and collapse; type a title in the Data Gathering
   quick-add row and press Enter: the task appears last in the group and the row is ready again.
   Drag it into Kickoff and to the top; change its owner inline; reload: all persisted. The Board
   shows the same relative order inside its column.
7. **List sort** (US2): sort by Due date; try to drag: the message explains manual order is needed
   and offers "Use manual order".
8. **Timeline** (US3): drag a task bar two weeks right: the tooltip shows the new dates, release
   saves, Activity records it. Drag the right edge left past the start: refused with the date
   rule and the bar returns. A bar with only a due date moves only the due date. As a Member,
   phase bars have no handles. Focus a bar and press Shift+→ then Enter: shifted one week.
   Move a task to start before its predecessor's due date: it saves with a conflict warning.
9. **Plan drags** (US4): on Overview drag the third phase to the top by its handle (Manager);
   on Readiness drag a deliverable into another phase; reload: persisted and recorded. As a
   Member, Overview phases have no handle; the row menu still offers Move up/down for Managers.
10. **Side panel** (US5): open a task from the Board: the panel shows every field editable
    inline, comments and the task's own activity; change priority inline; the Board behind
    stays usable.
11. **Remembered view** (US5): on Board with filters, go to Projects, open another project, come
    back via Projects: Board and the same filters are restored. Press `n`: the quick-add is
    focused; Escape dismisses it.
12. **Projects list** (US5): cards show progress, status, go-live, overdue and "my open tasks";
    sort by go-live.

## Verify

```sh
npm test -w apps/api                                            # tasks.service (move, no-op, renumber), deliverables.service, projects.service (myOpenTasks, sort), resolver specs
DATABASE_URL=<baseline_dev url> npm run test:e2e -w apps/api    # workspace.e2e-spec.ts
npm run schema:check
npm run codegen -w apps/web && npm test -w apps/web -- --run    # lib.test.ts, dnd/*.test.ts, Board/List/Gantt tests
npm run typecheck && npm run lint && npm run build
```
