# Research: HIS Implementation Workspace UI Review

## Decision 1: Deliver a frontend-first visual review slice

- **Decision**: First create a public `/preview` route showing one realistic, fictional hospital HIS implementation project, using local fixture data. This gives the user a deployable UI to review before committing to unresolved backend and collaboration details.
- **Rationale**: The user's immediate deployment goal is to show the UI visually. The repository already has a React/Vite frontend and Dockerfile; a preview route can be built and reviewed without database provisioning, account setup, or real hospital data.
- **Alternatives considered**: Build the complete project API, Prisma schema, permissions, and UI before the first visual review. Rejected for this first increment because it delays visual feedback and requires decisions that are not needed to review the interface.

## Decision 2: Reuse the existing frontend stack and conventions

- **Decision**: Use the existing React 19, TypeScript 6, Vite 8, TanStack Router, Tailwind CSS 4, shadcn/ui, Lucide, Vitest, and React Testing Library setup. Keep the new UI in `apps/web/src/feature/implementation-preview/` and add a public TanStack file route.
- **Rationale**: The stack is fixed by the project constitution. Existing `Card`, `Button`, `Badge`, `PageHeader`, `Table`, and layout components provide the established visual and accessibility conventions.
- **Alternatives considered**: A separate standalone HTML prototype or a new UI framework. Rejected because it would not be the actual application and would duplicate styling and routing.

## Decision 3: Use deterministic fixture data and no clinical records

- **Decision**: Show a fictional hospital, fictional team members, synthetic task content, and synthetic dates/statuses. The preview has no patient-level or other real clinical data and does not write to an API or persist edits.
- **Rationale**: The preview is for visual feedback only. Deterministic data makes tests stable and avoids privacy risk.
- **Alternatives considered**: Use details from a real hospital or import real implementation data. Rejected because neither is necessary for visual review and it could expose sensitive information.

## Decision 4: Implement the Gantt visualization with existing browser primitives

- **Decision**: Render the timeline from phase/task fixture data using responsive CSS grid/positioning and accessible text labels. Add no chart dependency.
- **Rationale**: The initial view needs a compact Gantt-style schedule, not a general-purpose analytics suite. The existing stack can render the display without another package.
- **Alternatives considered**: Add a chart/Gantt library immediately. Rejected until interaction and scale needs are clarified.

## Decision 5: Keep the preview route isolated from authentication and production data

- **Decision**: Add `/preview` as an explicitly public, demo-only route. Preserve the existing `/` setup/login redirect and all protected routes. Label the screen as a demo and keep all displayed content static.
- **Rationale**: A review URL must work before account setup while the real application remains authenticated. Isolation makes it easy to remove or replace the preview later.
- **Alternatives considered**: Temporarily weaken the protected route or change `/` to show a demo. Rejected because it could bypass existing authentication flows.

## Deferred decisions

Project invitations, project-specific permissions, live comments/mentions/notifications, uploads, multi-organization behavior, editable global templates, and persistent project data are not required for this visual review slice. Resolve them before implementing the corresponding production behavior; this preview does not imply a decision on those capabilities.
