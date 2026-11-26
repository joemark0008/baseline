# Preview UI Contract

## Route

- **Path**: `/preview`
- **Access**: Public demo route; must not require a session, setup token, or API call.
- **Root route behavior**: `/` remains unchanged and continues its existing setup/login redirect behavior.
- **Data source**: Local, deterministic fictional fixture in the web app.

## Display sections

The preview includes:

1. Project identity, hospital/client label, current phase, overall progress, target go-live, and status.
2. The nine implementation phases in their standard order.
3. A Gantt-style timeline with phase/task labels, date ranges, and dependency cues where present.
4. Task overview with owner, phase, due date, status, and priority.
5. Data-readiness deliverables and status.
6. Fictional project participants and recent activity.

## Interaction

- Overview, Timeline, Tasks, and Data Readiness navigation updates the visible section without a page reload.
- Task filters (when shown) operate over the local fixture only.
- No create, edit, delete, comment, invite, upload, or other mutation is persisted.
- The page clearly identifies itself as a demo using sample data.

## Privacy and accessibility

- No patient or real personal health data is displayed or solicited.
- Controls use the existing shadcn/UI components, have accessible names, and work by keyboard.
- The page is usable at 375px width. A wide timeline scrolls within its own region rather than causing horizontal page scroll.
- Light and dark themes use existing semantic theme tokens.

## Error behavior

The fixture is bundled with the route; no network loading state is needed. If a component receives missing optional values, it displays a neutral empty state rather than a raw `undefined` value.
