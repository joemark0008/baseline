# Data Model: HIS Implementation Preview

This is a presentation model for deterministic, fictional preview data. It is not a database schema and does not contain patient records.

## ImplementationProject

Represents the single demo project shown by the preview.

- `id`: stable demo identifier.
- `name`: implementation engagement name.
- `hospitalName`: fictional client/hospital name.
- `status`: `on_track`, `at_risk`, or `delayed`.
- `startDate`, `targetGoLiveDate`: planned project boundaries.
- `overallProgress`: integer from 0 to 100 for display.
- `currentPhaseId`: phase currently in progress.
- `phases`: ordered lifecycle phases.
- `team`: fictional participants and their project roles.
- `activity`: recent synthetic project events.

## Phase

A stage in the standard HIS implementation lifecycle.

- `id`: stable identifier.
- `name`: one of the nine lifecycle phase names in `spec.md`.
- `startDate`, `endDate`: planned phase dates; end must not precede start.
- `status`: `complete`, `in_progress`, `upcoming`, or `at_risk`.
- `progress`: integer from 0 to 100.
- `tasks`: tasks grouped under this phase.
- `deliverables`: readiness items associated with this phase.

## Task

A representative unit of work displayed in task and timeline views.

- `id`, `title`, `phaseId`: identity and phase relationship.
- `ownerId`: reference to a fictional team member.
- `dueDate`: planned date for display.
- `status`: `complete`, `in_progress`, `upcoming`, `blocked`, or `overdue`.
- `priority`: `high`, `medium`, or `low`.
- `predecessorIds`: optional task dependencies for visualization.

## TeamMember

A fictional project participant.

- `id`, `name`, `initials`: display identity.
- `role`: hospital/client or vendor implementation role.
- `organization`: fictional organization label.

## Deliverable

A phase output or data-readiness checkpoint.

- `id`, `title`, `phaseId`: identity and phase relationship.
- `ownerId`: responsible fictional member.
- `status`: `ready`, `in_review`, `needs_work`, or `not_started`.
- `dueDate`: optional planned review date.

## ActivityItem

A synthetic recent project event.

- `id`, `actorId`, `action`, `target`, `createdAt`: event display values.

## Preview-only constraints

- All records are local fixture data; no CRUD or persistence is provided.
- No patient identifiers, clinical notes, patient records, or real hospital contacts are allowed in the fixture.
- Cross-references (`ownerId`, `phaseId`, `actorId`) must resolve within the fixture.
