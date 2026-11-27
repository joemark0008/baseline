# Contract: UI interaction (feature 011)

Extends `specs/010-pm-workspace-redesign/contracts/ui-interaction.md`; everything there still
applies (sensors, keyboard map for drags, announcements, optimistic feedback).

## Filter bar additions

| Control             | Element                                       | Behaviour                                                                                          |
| ------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Search              | `input[type=search]` labelled "Search tasks"  | Immediate local echo; writes `?q=` after 150 ms idle; Escape clears; `/` focuses it; clear button. |
| Mine                | toggle button, `aria-pressed`                 | Writes `?mine=true` / removes it.                                                                  |
| Show done           | toggle button "Show done (N)" / "Hide done"   | Flips `showDone` in the preference; N is the hidden done count; shown on Board and List.           |
| Lanes by phase      | toggle button, Board only, `aria-pressed`     | Flips `boardLayout`.                                                                               |
| Collapse/Expand all | two buttons, List, Timeline and Board (lanes) | Set `collapsed` to all phase ids / empty.                                                          |

Shortcuts never fire while an input, textarea, select or dialog has focus (010 rule).

## Headers and counts

- Board column: `<name> <matching>` and, when filters or search are active, `of <total>`; the
  Complete column adds `· N done hidden` with "Show done" inline when hiding.
- List group header: name, `<open>` badge, `<overdue>` in destructive colour when > 0, `N done`
  (muted); when folded the same figures stay visible; when filters are active add `<matching>
match`.
- Board lane header: phase name and the same figures; folded lane shows the header only.
- Timeline folded phase: the phase row only; the row's label gains "(N tasks)".

## Folding

| Action                 | Pointer                   | Keyboard                                                    |
| ---------------------- | ------------------------- | ----------------------------------------------------------- |
| Fold / unfold a phase  | click the chevron or name | focus the trigger, Enter or Space                           |
| Fold / unfold all      | Collapse all / Expand all | same buttons, Tab + Enter                                   |
| Drop on a folded phase | drop on its header        | pick up a row, arrow to the folded header, drop             |
| Quick-add on folded    | n/a (row hidden)          | the phase unfolds when its quick-add receives focus via `n` |

The fold state is `aria-expanded` on the trigger; the content region is removed from the DOM
when folded (Collapsible default), so folded tasks are not tabbable.

## Board lanes

- Grid: one `section` per phase in plan order, `aria-label="<phase> lane"`, containing the four
  status cells; each cell is a `BoardColumn` with container id `cell:<phaseId>:<status>`.
- Drag: pointer, keyboard (Space, arrows across cells in reading order, Space) and card menu
  ("Move to status…", "Move to phase…", "Move up/down") all produce one `moveProjectTask`.
- Announcements: "Picked up <title> in <status>, <phase>, position i of n" and "Moved to
  <status>, <phase>, position i of n".
- Phase filter set: only that lane renders; "Lanes by phase" stays on.
- Empty phase: lane renders with four empty cells (min height 4 rem) so drops are possible.

## Empty states

| Reason            | Message                                     | Action                   |
| ----------------- | ------------------------------------------- | ------------------------ |
| `all-done`        | "All work in this view is done."            | Show done                |
| `no-match`        | "No tasks match."                           | Clear search and filters |
| `only-done-match` | "N completed tasks match."                  | Show done                |
| `none`            | (project has no tasks) existing empty state | New task / quick-add     |

## Feedback

Toggling hide done, folding and switching layout are instant and local; no spinner, no toast.
Drag feedback is unchanged from 010.
