# Quickstart: Keep Large Projects Readable

## Run

Sign in at https://baseline-dev.joemarkgimeno.com (live dev) or locally with `npm run dev:api`
and `npm run dev:web`. Node runs inside the dev containers on the server (`docker exec -it
web-<uuid> sh`, `api-<uuid> sh`). Apply the migration with `npx prisma migrate dev` in the api
container. Design details: `research.md`, `data-model.md`, `contracts/`.

Seed for the checks: a project with five phases, about 300 tasks of which 200 are Complete and
5 of those completed today (the e2e spec creates a smaller version of this fixture; for the
timing checks use a throwaway script against the dev database, removed afterwards).

## Validate end to end

1. **Hide done** (US1): open the Board. The Complete column shows only the 5 recent completions
   and "200 done hidden · Show done". Drag an open card into Complete: it stays visible and the
   figure reads 201. Open the List: each phase shows "N done" and only open rows. Press "Show
   done": every completed task appears on both views; reload: still shown. Press "Hide done":
   hidden again. Open another project: hidden by default there.
2. **Precedence** (US1): with done hidden, set Status = Complete: all completed tasks show. Clear
   the status filter; open a completed task's link (`?task=<id>` from a notification email): the
   panel opens and the task is visible in the view.
3. **Search** (US2): type three letters of a title: Board, List and Timeline narrow at once;
   headers show "3 of 60". Switch views: the box keeps the text and the URL carries `?q=`. Copy
   the URL into a new tab: same narrowed view. Type a name with an accent, then without: same
   result. Press Escape: cleared. Press `/`: the box is focused; press `n` while in it: the
   letter is typed.
4. **Empty states** (US2): search for text that matches nothing: "No tasks match" with Clear.
   Search for text that matches only completed tasks: "N completed tasks match" with Show done.
5. **Mine** (US2): press Mine: only your tasks; combine with search and Overdue.
6. **Folding** (US3): on the List fold two phases: headers show open/overdue/done; reload: still
   folded. Open the Timeline: the same two phases show only their phase bars. Press Expand all,
   then Collapse all. Drag a row onto a folded header: the task lands last in that phase and the
   header counts update; unfold to confirm the order. With done hidden and a search active,
   drop again: the task is still last in the phase's full order.
7. **Lanes** (US4): on the Board press "Lanes by phase": one lane per phase, four cells each,
   empty phases included. Drag a card from phase 1 / Upcoming to phase 2 / In progress: one
   activity entry reads "moved task … to in progress, moved task … to phase …". Fold a lane: the
   List shows that phase folded too. Set the phase filter: one lane. Reload: lanes still on.
   Keyboard: focus a card's grip, Space, arrow to another cell, Space: same result.
8. **Permissions** (FR-019): as a Member, everything above works; as a non-member the project is
   not found. Drags still refuse foreign phases server-side.
9. **Counts** (FR-020): the project header's open and overdue figures, the project card and the
   Overview do not change with any readability setting.
10. **Timing** (SC-001, SC-003): with the 300-task fixture, Board and List open in under 2 s
    (devtools Performance); typing in search updates the view within 300 ms of the last key.

## Automated checks

- API: `npm test -w apps/api` (unit; `completionStamp`, `update`/`move` setting and clearing
  `completedAt`), `npm run test:e2e -w apps/api` (`completedAt` set on completion, cleared on
  reopen, backfill invariant).
- Web: `npm test -w apps/web` (`visibleTasks` precedence, `normaliseText`, `emptyReason`,
  `matchCounts`, preference round-trip with stale phase ids, search debounce, folded-group drop,
  lanes drop producing one move request with phase and status, Gantt folded rows).
- Gate: `npm run lint`, `npm run format:check`, `npm run build`, `npm run schema:generate`
  (schema must be unchanged after regeneration), `npm run codegen -w apps/web`.
