# Feature Specification: Keep Large Projects Readable

**Feature Branch**: `011-large-project-readability`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "keep large projects readable: hide done, search, collapsible phases, swimlanes"

**Builds on**: `specs/010-pm-workspace-redesign` (Board, List and Timeline work views with shared
filters, remembered view preference, drag and drop) and `specs/007-his-implementation`.

**Scope**: The three work views inside a project and their shared filter bar. A hospital
implementation project accumulates hundreds of tasks over its life, and today every one of them is
drawn, in full, every time: the Board's Complete column grows without limit, the List opens every
phase expanded, the Timeline shows a bar per task, and there is no way to find a task by name.
This feature keeps those views readable as work accumulates: finished work is out of the way by
default, a search narrows every view to what was typed, phases fold away and remember it, and the
Board can be split into one lane per phase. Nothing changes in what a task is, who can edit it,
or how drags are saved; the projects list, Overview, Readiness, Activity and settings are
unchanged.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Finished work stays out of the way (Priority: P1)

A project participant opens the Board or the List of a project that has been running for months.
Tasks that are complete are not shown among the open work: the Board's Complete column holds only
what was finished in the last seven days, with a count of everything completed and a control to
show it all; the List shows open tasks under each phase with a "N done" note per phase and the
same control. Turning "Show done" on brings every completed task back, in its place, until the
person turns it off again. The choice is remembered for that project on that device.

**Why this priority**: Completed tasks are the bulk of a mature project and the least useful to
look at. Hiding them is the single change that removes the most clutter, costs the person nothing
to learn, and makes the other views faster to scan.

**Independent Test**: Open the Board and the List of a project with 40 open tasks and 60 completed
ones, 5 of them completed this week. Confirm the Board's Complete column shows 5 cards and a "60
done" control, the List shows 40 rows plus a per-phase done note, and that "Show done" reveals all
60, survives switching between Board and List and a reload, and that completing a task moves it
into view in the Complete column at once.

**Acceptance Scenarios**:

1. **Given** a project with completed tasks older than seven days, **When** the Board opens, **Then** those tasks are absent from the Complete column, the column header shows the total done count, and a "Show done" control is visible.
2. **Given** "Show done" is off, **When** a person drags a card into Complete, **Then** the card stays visible in the Complete column (it was completed just now) and the done count increases by one.
3. **Given** "Show done" is off, **When** the person turns it on, **Then** every completed task appears in the Board's Complete column and in its phase group on the List, in manual order, and the control reads "Hide done".
4. **Given** "Show done" was turned on for project A, **When** the person opens project B, **Then** project B uses its own remembered setting (off by default).
5. **Given** the status filter is set to Complete, **When** the List or Board renders, **Then** all completed tasks are shown regardless of the "Show done" setting, so a filter never produces an empty view by accident.
6. **Given** a completed task is hidden, **When** a link opens that task directly (a notification email, a shared link), **Then** the task's side panel opens and the task is revealed in the view behind it.

---

### User Story 2 - Find work by typing (Priority: P1)

A participant knows roughly what a task is called, or who it belongs to, and types a few letters
into a search box in the filter bar. Board, List and Timeline narrow at once to tasks whose title
or owner name contains what was typed, ignoring case and accents. Each phase group and Board
column shows how many matches it holds, groups and columns with no match collapse to a one-line
"no matches", and clearing the box restores the view. A "Mine" switch next to the search narrows
to the person's own tasks in one click. Search and "Mine" are part of the shared filters, so they
carry across the three views and can be copied as a link.

**Why this priority**: Once a project passes a few dozen tasks, scrolling to find one is slower
than typing its name. Search is also the fallback that keeps every other view usable no matter
how large the project grows.

**Independent Test**: In a project with 200 tasks, type three letters of a task's title and confirm
only matching tasks remain on the Board, the List and the Timeline, with correct counts per group;
switch views and confirm the search persists; copy the address into a new tab and confirm the same
narrowed view opens; press Escape in the box and confirm everything returns.

**Acceptance Scenarios**:

1. **Given** the Board is open, **When** the person types "lab" in the search box, **Then** within a moment only cards whose title or owner name contains "lab" (any case, accents ignored) remain, and each column header shows its match count.
2. **Given** a search is active, **When** the person switches to the List or the Timeline, **Then** the same search applies there and the search box still shows the text.
3. **Given** a search matches no task, **When** a view renders, **Then** it shows one clear "No tasks match" message with a control to clear the search, not an empty board.
4. **Given** the person presses the "Mine" switch, **When** the views render, **Then** only tasks owned by the person remain, combined with any search text and other filters.
5. **Given** a search is active, **When** the person drags a visible card to another column, **Then** the move saves exactly as without a search, and the card stays where it was dropped.
6. **Given** the search box has focus, **When** the person presses Escape, **Then** the search clears; **When** they press the quick-add shortcut while typing, **Then** the letter is typed, not treated as a shortcut.

---

### User Story 3 - Fold phases away and have it remembered (Priority: P2)

A participant working on the "Build" phase folds the other phases on the List and on the
Timeline. A folded phase shows only its header with counts (open, overdue, done) on the List, and
only its phase bar on the Timeline. "Collapse all" and "Expand all" act on every phase at once.
Which phases are folded is remembered for that project on that device, so the next visit opens the
same way. Dropping a task on a folded phase's header still moves it into that phase, at the end.

**Why this priority**: Phases are the natural unit people think in. Folding what is finished or
far off lets a long project read like a short one, and remembering it means the person folds once.

**Independent Test**: On the List, fold two of five phases, reload and confirm they stay folded and
their headers show counts; drag a task onto a folded header and confirm it lands last in that
phase; switch to the Timeline and confirm the same phases are folded there, showing only phase
bars; use "Expand all" and confirm every phase opens.

**Acceptance Scenarios**:

1. **Given** the List is open, **When** the person folds a phase, **Then** its tasks disappear, its header shows "N open · N overdue · N done", and reloading the page keeps it folded.
2. **Given** a phase is folded on the List, **When** the person opens the Timeline, **Then** that phase is folded there too and shows only its phase bar.
3. **Given** a folded phase, **When** a task is dropped on its header, **Then** the task moves into that phase as its last item and the header counts update.
4. **Given** several phases are folded, **When** the person chooses "Expand all", **Then** every phase opens; **When** they choose "Collapse all", **Then** every phase folds.
5. **Given** a phase is folded, **When** the person uses the quick-add row for that phase, **Then** the phase unfolds and the new task is visible.
6. **Given** a search or filter is active, **When** a folded phase contains matches, **Then** its header shows the match count so nothing is hidden silently.

---

### User Story 4 - Board lanes by phase (Priority: P2)

A participant switches the Board from plain columns to **lanes by phase**: one horizontal lane
per phase in plan order, each crossing the four status columns. A card dragged to another lane
changes its phase; dragged to another column it changes status; both at once in one drop. Lanes
fold like phases on the List, share the same folded state, and show counts when folded. Empty
lanes stay visible so work can be dropped into them. The choice of plain or lanes is remembered
per project on the device.

**Why this priority**: Columns alone mix every phase's work together; lanes keep the Board
readable when several phases are active at once. It depends on folding (User Story 3) to stay
compact, so it comes after it.

**Independent Test**: Turn on lanes in a project with four phases; confirm one lane per phase in
plan order with the four columns in each; drag a card from phase 1 / Upcoming to phase 2 / In
progress and confirm both the phase and the status change and are recorded once in the activity
history; fold a lane and confirm the List shows that phase folded too; reload and confirm the
Board still shows lanes.

**Acceptance Scenarios**:

1. **Given** the Board shows plain columns, **When** the person turns on "Lanes by phase", **Then** the Board shows one lane per phase in plan order, each with the four status columns and its own counts, and the setting is remembered for the project on that device.
2. **Given** lanes are on, **When** a card is dragged from one lane's column to another lane's column, **Then** the task's phase and status both change in one saved move, recorded once in the activity history, with the same keyboard and menu equivalents as other drags.
3. **Given** lanes are on, **When** a lane is folded, **Then** it shows only its header and counts, and the same phase is folded on the List and the Timeline.
4. **Given** the phase filter selects one phase, **When** lanes are on, **Then** only that lane is shown.
5. **Given** a phase has no tasks, **When** lanes are on, **Then** its lane is still shown with empty columns so cards can be dropped into it.

---

## Edge Cases

- A project where every task is complete: the Board and List show the "all done" state with the
  "Show done" control, never a blank page.
- A task completed exactly seven days ago sits on the boundary of the "recent" window; the window
  is seven full days counted from now, so it drops out of the Complete column at that moment.
- "Show done" off and status filter "Complete": the filter wins and completed tasks are shown.
- A search that matches only hidden completed tasks: the view says how many done tasks match and
  offers "Show done", so the person is not told there are no matches.
- Search text with leading or trailing spaces, or only spaces: trimmed; an empty search is no
  search.
- Search while typing fast: the view may lag by a moment but never shows results for an older
  text once a newer one is typed.
- Dropping on a folded phase header while a search is active: the task moves to the end of the
  phase's full order, not the end of the filtered subset.
- Folding the only phase: allowed; the view shows the folded header and nothing else.
- A phase removed from the plan while it is remembered as folded: the stale entry is ignored.
- Lanes on, with a search that matches tasks in one phase only: other lanes show "no matches"
  headers rather than disappearing, unless folded.
- Lanes on a narrow screen: lanes scroll vertically, columns horizontally, as the plain Board does.
- A person without edit rights: hide done, search, folding and lanes all work; drops are not
  offered, as today.
- Two devices: hide done, folds and lanes are per device, like the remembered work view; they do
  not sync between devices and are not shared with other people.

## Requirements _(mandatory)_

### Functional Requirements

**Finished work**

- **FR-001**: Board and List MUST hide completed tasks by default, except that the Board's Complete column MUST still show tasks completed within the last seven days.
- **FR-002**: Wherever completed tasks are hidden, the view MUST show how many are hidden (Board: in the Complete column header; List: per phase header) and offer a single "Show done" / "Hide done" control that applies to Board and List alike.
- **FR-003**: The "Show done" choice MUST be remembered per person, per project, on the same device, alongside the remembered work view; it MUST default to hidden.
- **FR-004**: A status filter of Complete MUST show all completed tasks regardless of the "Show done" setting. Opening a specific task (by link or from a notification) MUST reveal that task even if it would otherwise be hidden.
- **FR-005**: Completing a task by any means MUST keep it visible in the Complete column immediately, since it falls inside the recent window.

**Search**

- **FR-006**: The shared filter bar MUST include a text search that narrows all three work views to tasks whose title or owner name contains the typed text, ignoring case and accents, with leading and trailing spaces ignored.
- **FR-007**: Search text MUST be one of the shared filters: it carries across Board, List and Timeline, is part of the view's address so it can be copied as a link, and is restored with the other remembered filters.
- **FR-008**: The filter bar MUST offer a one-click "Mine" switch that narrows to tasks owned by the signed-in person, combinable with every other filter.
- **FR-009**: While a search or filter is active, every Board column, List phase group and Board lane MUST show its count of matching tasks; a view with no matches MUST show one "No tasks match" message with a control to clear the search; a search whose only matches are hidden completed tasks MUST say so and offer "Show done".
- **FR-010**: Pressing Escape in the search box MUST clear the search; keyboard shortcuts MUST NOT fire while the search box has focus.

**Folding phases**

- **FR-011**: Each phase on the List, each phase on the Timeline and each lane on the Board (when lanes are on) MUST fold and unfold; one shared folded state per phase MUST apply across the three views.
- **FR-012**: A folded phase MUST show its name and counts (open, overdue, done, and matches when a search or filter is active); on the Timeline it MUST show only its phase bar.
- **FR-013**: Folded phases MUST be remembered per person, per project, on the same device, and restored on return; phases no longer in the plan MUST be ignored.
- **FR-014**: "Collapse all" and "Expand all" MUST be available wherever phases fold.
- **FR-015**: A task dropped on a folded phase (its List header or its folded Board lane) MUST move into that phase as its last item in manual order; using a folded phase's quick-add MUST unfold it.

**Board lanes**

- **FR-016**: The Board MUST offer a "Lanes by phase" option that shows one lane per phase in plan order, each containing the four status columns with counts; empty phases MUST still get a lane. The option MUST be remembered per person, per project, on the same device, and MUST default to plain columns.
- **FR-017**: With lanes on, a drop into another lane and column MUST change phase and status in one saved move, recorded once in activity, with the keyboard and menu equivalents required by `specs/010-pm-workspace-redesign` FR-009.
- **FR-018**: With lanes on and the phase filter set, only the selected phase's lane MUST be shown.

**Unchanged rules**

- **FR-019**: Permissions, validation, manual order, drag behaviour, activity recording and the no-op rule from `specs/010-pm-workspace-redesign` (FR-005 to FR-013, FR-018, FR-019) MUST apply unchanged under every combination of hide done, search, folding and lanes.
- **FR-020**: Hidden, folded and filtered-out tasks MUST remain in the project's data and in counts, progress and overdue figures; readability settings MUST change only what is drawn.

### Key Entities

- **Readability preference**: the per-person, per-project, per-device record of "show done" (on or
  off), folded phases (a set of phase references) and Board layout (plain or lanes). It extends the
  remembered work view from `specs/010-pm-workspace-redesign` and is never shared or stored on the
  server.
- **Shared filters**: the existing set (phase, owner, status, overdue, department when available,
  sort, open task) gains a search text and a "mine" switch; they travel with the view's address.
- **Recent completion window**: the seven-day period before now during which a completed task still
  shows in the Board's Complete column with "show done" off.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a project with 300 tasks of which 200 are complete, the Board and List open showing only the open work plus recent completions, with the hidden count visible, in under 2 seconds on a typical office connection.
- **SC-002**: A person who knows part of a task's title finds and opens it from any work view in under 10 seconds using search, without scrolling.
- **SC-003**: Search results reflect the typed text within 300 ms of the last keystroke for a 500-task project.
- **SC-004**: Folded phases, "show done" and the Board layout are restored on 100% of return visits to the same project on the same device, including after a browser restart.
- **SC-005**: With lanes on, every drag that moves a card between lanes and columns produces exactly one saved change and one activity entry, confirmed on a reload.
- **SC-006**: In usability checks with five project members on a 300-task project, each completes "find task X", "hide finished work" and "fold phases you are not working on" at first attempt without help.
- **SC-007**: No count on the project header, project card or Overview changes when readability settings change; totals, progress and overdue figures match the unfiltered project.

## Assumptions

- "Done" means a task whose status is Complete; there is no separate archive state.
- "Recent" completions are those completed within the last seven full days; completion time is the
  moment the status last became Complete.
- Search matches on task title and owner name only; description, comments and deliverables are
  not searched in this feature. Matching is substring, case- and accent-insensitive.
- Readability settings (show done, folded phases, lanes) are per device like the remembered work
  view from `specs/010-pm-workspace-redesign`; syncing them between devices or sharing them with
  teammates is out of scope.
- The Timeline gains folding only; a date focus window (for example "this month") is out of scope.
- Very large projects beyond 1,000 tasks are out of scope for the responsiveness criteria.
- Department lanes or owner lanes on the Board are out of scope; lanes are by phase only.
- Deliverables on Readiness, phases on Overview and the projects list are unchanged.
