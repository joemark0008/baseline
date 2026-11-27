# Feature Specification: Project Management Workspace Redesign with Drag and Drop

**Feature Branch**: `010-pm-workspace-redesign`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "redesign ui to be more like project management app implement drag and drop feature"

**Builds on**: `specs/007-his-implementation` (projects, phases, tasks, deliverables, timeline) and
`specs/009-project-org-chart` (department tag on tasks, when delivered).

**Scope**: The project workspace (everything under one project) and the projects list. Settings,
roles, users, sign-in and the dashboard are unchanged. Today the workspace is a set of tabs with
a table of tasks, a phase list reordered with arrow buttons, a read-only Gantt chart and a task
detail sheet. This feature turns it into a work-centred project management workspace: a board, a
grouped list and an interactive timeline that are all driven by direct manipulation (drag and
drop), with a keyboard and menu alternative for every drag.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Move work on a board (Priority: P1)

A project participant opens the project's **Board** view and sees tasks as cards in columns by
status: Upcoming, In progress, Blocked, Complete. To update progress they drag a card into another
column; the status changes immediately and the card shows in its new place. They drag cards up
and down inside a column to put the most important work first. Cards show the essentials at a
glance: title, owner, due date (red when overdue), priority and phase.

**Why this priority**: Updating status is the most frequent action in daily use; a board with
direct manipulation is what people expect from a project management app and is the clearest
visible change from the current table.

**Independent Test**: Open the Board for a project with tasks in several statuses, drag one card
from Upcoming to In progress and one card above another in the same column; reload the page and
confirm both the status and the order persist and that the Activity tab records the status change.

**Acceptance Scenarios**:

1. **Given** a project with tasks, **When** a participant opens the Board, **Then** each task appears as a card in the column matching its status, with the column header showing the count.
2. **Given** a card in Upcoming, **When** the participant drags it onto the In progress column, **Then** the task's status becomes In progress without any dialog, the change is recorded in the activity history, and the card stays where it was dropped.
3. **Given** two cards in a column, **When** one is dragged above the other, **Then** the new order persists for every participant.
4. **Given** the drop fails (for example the network is down or the task was deleted by someone else), **When** the failure is known, **Then** the card returns to its previous place and a short message explains why.
5. **Given** a participant who cannot use a mouse, **When** they focus a card and use the keyboard or the card's menu, **Then** they can move it to another column or reorder it with the same result as dragging.
6. **Given** the board filters (phase, owner, department, overdue), **When** a filter is set, **Then** only matching cards are shown and drag and drop still works among them.
7. **Given** a narrow screen, **When** the Board is opened, **Then** the columns scroll horizontally and cards can still be moved by touch (press and hold) or by the card menu.

---

### User Story 2 - Plan work in a grouped list (Priority: P1)

A participant opens the **List** view, which replaces the flat tasks table. Tasks are grouped
under their phase in plan order, each group collapsible with a count and a quick-add row to type
a new task straight into that phase. They drag a task into another phase group to re-plan it,
drag to reorder within a phase, and change status, owner, priority and due date inline on the
row without opening a dialog.

**Why this priority**: Planning by phase is the structure the implementation lifecycle is built
on; the list is where Managers and Members shape the plan. It is independent of the Board but
shares the same ordering, so the two views never disagree.

**Independent Test**: Open the List, quick-add a task into the Data Gathering group, drag it into
the Kickoff group, reorder it to the top, change its owner inline; reload and confirm the phase,
order and owner persist and the Board shows the same order within a column.

**Acceptance Scenarios**:

1. **Given** a project, **When** a participant opens the List, **Then** tasks are grouped by phase in plan order, each group shows its task count and can be collapsed, and tasks without a phase are impossible (every task has a phase).
2. **Given** a phase group, **When** the participant types a title into the group's quick-add row and presses Enter, **Then** a task is created in that phase at the end of the group with default status and no owner, and the row is ready for the next title.
3. **Given** a task row, **When** it is dragged into another phase group, **Then** its phase changes, the change is recorded in the activity history, and the row keeps its relative position where it was dropped.
4. **Given** a task row, **When** the participant changes status, owner, priority or due date inline, **Then** the value is saved on commit with the same validation as the task dialog and the row reflects it without reloading.
5. **Given** the list is sorted by a column other than manual order (for example due date), **When** the participant tries to drag, **Then** the list explains that reordering needs manual order and offers to switch back.
6. **Given** a Member, **When** they open the List, **Then** they can do everything above; phase management itself (rename, add, remove) stays on Overview for Managers.

---

### User Story 3 - Reschedule directly on the timeline (Priority: P2)

A participant opens the **Timeline** and drags a task bar left or right to shift its dates while
keeping its duration, or drags either end of the bar to change the start or due date. Managers
can do the same with phase bars. The bar snaps to whole days, a tooltip shows the new dates while
dragging, and the change is saved on release. The predecessor cue stays visible so the person can
see when a move would start a task before its predecessor ends.

**Why this priority**: Rescheduling is the second most common planning action after status
changes, and the timeline is the natural place for it; it depends on nothing in US1 or US2.

**Independent Test**: Drag a task bar two weeks to the right and shorten another by dragging its
end; reload and confirm the dates persist, the activity history records both, and a drag that
would put the due date before the start date is refused with a message.

**Acceptance Scenarios**:

1. **Given** a dated task bar, **When** it is dragged horizontally and released, **Then** start and due dates shift by the same number of days and the change is saved and recorded.
2. **Given** a dated task bar, **When** its right edge is dragged, **Then** only the due date changes; the left edge changes only the start date; a result with due before start is refused and the bar returns.
3. **Given** a task with only a due date (no start), **When** its bar is dragged, **Then** the due date moves and no start date is invented.
4. **Given** a phase bar, **When** a Manager drags or resizes it, **Then** the phase dates change; a Member sees phase bars as read-only.
5. **Given** a task that depends on a predecessor, **When** it is moved to start before the predecessor's due date, **Then** the move is allowed but the dependency cue is shown as a conflict on both views and in the task detail.
6. **Given** a keyboard user, **When** a bar is focused, **Then** arrow keys shift it by one day (with a modifier for a week), and Enter saves, Escape cancels.
7. **Given** a bar is dragged, **When** the drop would be outside the chart window, **Then** the window extends so the bar remains visible.

---

### User Story 4 - Arrange the plan by dragging (Priority: P2)

Managers arrange phases on Overview by dragging them with a handle instead of pressing arrow
buttons, and arrange deliverables on the Readiness page by dragging within a phase or into another
phase. Arrow controls remain in each row's menu for keyboard users.

**Why this priority**: Consistency: once tasks move by dragging, arrow-only reordering elsewhere
feels broken. It is small and independent.

**Independent Test**: Drag the third phase to the top and a deliverable from Data Gathering into
Data Build-Up; reload and confirm the orders and the deliverable's phase persist and are recorded.

**Acceptance Scenarios**:

1. **Given** the Overview phase list, **When** a Manager drags a phase by its handle to a new position, **Then** the order persists and is recorded; a Member sees no handle.
2. **Given** the Readiness page, **When** a deliverable is dragged within its phase or into another phase, **Then** its order and phase persist and are recorded.
3. **Given** any reorderable list, **When** a keyboard user opens the row's menu, **Then** "Move up" and "Move down" are available with the same result as dragging.

---

### User Story 5 - Work in a project management shell (Priority: P3)

The project workspace looks and behaves like a project management app: a compact project header
with the key numbers, a view switcher for Board, List and Timeline, and project pages (Overview,
Readiness, Org chart, Team, Stakeholders, Activity) grouped separately. Opening a task shows a
side panel that keeps the board or list visible, with inline editing of every field, comments and
the activity of that task. The workspace remembers each person's last view and filters per
project. The projects list becomes cards with progress, status, go-live date, overdue count and
the person's own open tasks. A keyboard shortcut opens quick-add from any view.

**Why this priority**: Polish that makes the new views feel like one product; valuable, but each
of the views above delivers on its own without it.

**Independent Test**: Open a project, switch to Board, set a filter, open a task in the side
panel and edit its priority inline, navigate to another project and back: the Board and its
filter are restored and the edit persisted. Press the quick-add shortcut on the List: the add
row is focused.

**Acceptance Scenarios**:

1. **Given** a project, **When** it opens, **Then** the header shows name, hospital, status, progress, overdue count and target go-live, and the view switcher offers Board, List and Timeline with the current one marked.
2. **Given** a task on the Board or List, **When** it is opened, **Then** a side panel shows every field editable inline, the comments and the task's own activity, and the board or list stays visible and usable behind it.
3. **Given** a person's last view and filters for a project, **When** they return to that project, **Then** the same view and filters are restored on that device.
4. **Given** the projects list, **When** it is opened, **Then** each project card shows progress, status, target go-live, overdue count and "my open tasks", and cards can be sorted by recent activity or go-live date.
5. **Given** any view, **When** the quick-add shortcut is pressed, **Then** the quick-add control for the current view is focused; pressing Escape dismisses it.

## Edge Cases

- Two participants drag the same task at the same time: the later change wins and the other person sees the task jump to its new place on their next refresh, with no error.
- A task is deleted or its phase removed while someone is dragging it: the drop fails cleanly and the board or list refreshes.
- A column or group with hundreds of tasks stays scrollable and draggable; a project with 300 tasks remains usable.
- A task with no dates on the Timeline: shown in the row list without a bar and cannot be dragged until it has a due date.
- Drag started by accident: moving less than a few pixels or dropping on the original spot changes nothing and records nothing.
- Dragging into Complete sets status Complete only; it does not change dates or owners.
- Touch devices: press and hold starts a drag; plain scrolling never moves a card.
- Reduced motion preference: drag feedback is still visible but without animated transitions.
- Filters hide a card's neighbours: the manual order among the hidden cards is preserved when the visible card is reordered.
- A Member drags a phase bar or phase row: the handle is absent and the drop is refused by the server if attempted.

## Requirements _(mandatory)_

### Functional Requirements

**Views**

- **FR-001**: The project workspace MUST offer three work views of the same tasks: Board (columns by status), List (groups by phase) and Timeline (bars by date), reachable from a view switcher in the project header.
- **FR-002**: The Board MUST show one column per task status in the order Upcoming, In progress, Blocked, Complete, each with its count; cards MUST show title, owner, due date with overdue emphasis, priority and phase, plus department when the task has one.
- **FR-003**: The List MUST group tasks by phase in plan order with collapsible groups, counts, inline editing of status, owner, priority and due date, and a quick-add row per phase that creates a task with the typed title.
- **FR-004**: The existing filters (phase, owner, status, overdue; department when available) MUST apply to all three views and MUST be shared across them within a project.
- **FR-005**: Tasks MUST keep one manual order within a project that the Board (within a column) and the List (within a phase) both respect; a new task is placed last. Sorting by another column is a view option that disables reordering until manual order is restored.

**Drag and drop**

- **FR-006**: Dragging a card between Board columns MUST change the task's status; dragging within a column MUST change its manual order. Dragging a row between List groups MUST change the task's phase; dragging within a group MUST change its manual order.
- **FR-007**: Dragging a task bar on the Timeline MUST shift start and due dates by the same whole number of days; dragging an edge MUST change only that date; a due date before the start date MUST be refused and the bar restored. Phase bars behave the same for Managers only.
- **FR-008**: Dragging a phase on Overview MUST reorder phases (Managers only). Dragging a deliverable on Readiness MUST reorder it within its phase or move it to another phase.
- **FR-009**: Every drag operation MUST have an equivalent that needs no pointer: a keyboard interaction on the focused item and a menu action (move to column, move to phase, move up or down, shift dates). Screen readers MUST announce pick-up, movement and drop.
- **FR-010**: Each drop MUST be reflected immediately in the interface and saved in the background; if saving fails, the item MUST return to its previous position and the person MUST see a short reason.
- **FR-011**: Every change made by drag and drop MUST be recorded in the project activity history exactly as the same change made through a form would be.
- **FR-012**: Drag and drop MUST work with touch (press and hold to start) and MUST respect the person's reduced-motion preference.
- **FR-013**: A drop that does not change anything (same position, same column, same dates) MUST NOT save or record anything.

**Shell and details**

- **FR-014**: Opening a task from Board or List MUST show a side panel with every field editable inline, the task's comments and its activity, while the view behind stays visible.
- **FR-015**: The workspace MUST remember, per person and per project on the same device, the last work view and its filters, and restore them on return.
- **FR-016**: The projects list MUST show cards with progress, status, target go-live, overdue count and the person's own open task count, sortable by recent activity or go-live date.
- **FR-017**: A keyboard shortcut MUST focus the quick-add control of the current view; shortcuts MUST NOT fire while typing in a field.

**Access and rules**

- **FR-018**: Permissions are unchanged: Members move, edit and create tasks and deliverables; only Managers move phases or phase bars; non-members are denied. The interface hides handles the person cannot use, and the server refuses attempts regardless.
- **FR-019**: Existing validation rules (date ranges, predecessor cycle, phase in the same project) MUST apply to every drag result; a predecessor conflict (task starts before its predecessor ends) MUST be shown as a warning, not refused.

### Key Entities

- **Task** (existing): gains a manual position within its project used by the Board and List.
- **Deliverable** (existing): its order and phase can change by dragging.
- **Phase** (existing): its order and dates can change by dragging (Managers).
- **View preference**: a person's last work view and filters for a project, kept on their device.
- **Activity Entry** (existing): records drag-driven changes identically to form-driven ones.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A participant can change a task's status on the Board in under 3 seconds without opening any dialog.
- **SC-002**: A participant can move a task to another phase and set its position in the List in under 5 seconds.
- **SC-003**: A participant can shift a task by two weeks on the Timeline in under 5 seconds, and the saved dates match the dates shown while dragging.
- **SC-004**: 100% of drag operations have a keyboard or menu equivalent that produces the same saved result.
- **SC-005**: 100% of drag-driven changes appear in the activity history with actor and time.
- **SC-006**: A board or list with 300 tasks remains usable: the view opens in under 2 seconds and a drag gives visible feedback within 100 milliseconds.
- **SC-007**: In a usability check, 9 of 10 first-time users move a task to In progress on the first attempt without instructions.
- **SC-008**: Returning to a project restores the person's last view and filters 100% of the time on the same device.

## Assumptions

- "Project management app" means the familiar board, list and timeline trio with direct manipulation, in the style of mainstream project tools; it does not mean adding new domains (budgets, time tracking, sprints, chat).
- Scope is the project workspace and the projects list; the dashboard, settings, roles, users, invites and sign-in screens are not redesigned.
- One manual task order per project serves both Board and List; there is no separate order per column or per status.
- Drag and drop changes the same fields that the task, phase and deliverable dialogs already change; no new fields other than the task position are introduced.
- Multi-select drag, bulk edit, swimlanes, custom columns, custom statuses and saved shared views are out of scope for this release.
- View preferences are kept per device, not synchronised across devices.
- Concurrency is last-write-wins with refresh, consistent with the rest of the workspace.
- Web and desktop browsers are the primary target; touch support is required on tablets and phones, but a native mobile app is out of scope.
- The department chip and filter depend on feature 009; if 009 is not yet delivered, those parts are omitted without blocking the rest.
