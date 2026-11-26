# Feature Specification: HIS Implementation Project Workspace

**Feature Branch**: `007-his-implementation`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "A project management tool built specifically to implement a hospital information system end to end. It covers user collaboration, Gantt chart, tasks and timeline."

**Reference context**: HIS3 Implementation Guideline shared by the user: https://docs.google.com/document/d/1d1wDMtmHO3lhIoiDv_GJLybcOsEWAYBPqyue2Qa2Prc/edit?usp=sharing

The guideline describes a nine-phase implementation lifecycle: Kickoff, Data Gathering, Data Build-Up, Requirements Analysis, Training, Pre-Go-Live, Go-Live, Post-Go-Live Support, and Monitoring & Continuous Improvement. It identifies hospital/client and vendor roles, phase outputs, schedules, contacts, and data-readiness activities. Its detailed examples focus mainly on kickoff and data preparation; later phases are described at a higher level.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create an HIS implementation project (Priority: P1)

A hospital-side or vendor-side project manager creates a workspace for one hospital HIS implementation. They provide the project basics and start from the standard implementation lifecycle, so the team has a shared structure instead of building a plan from a blank page. The manager can set phase owners and planned dates and adjust the phase plan to fit the engagement.

**Why this priority**: Every schedule, task, deliverable, and collaboration activity needs a project workspace and a shared implementation structure.

**Independent Test**: Create a project with the standard lifecycle and verify that all nine phases appear in order, can be assigned owners and planned dates, and remain available after leaving and reopening the project.

**Acceptance Scenarios**:

1. **Given** an authenticated user with permission to create projects, **When** they create an HIS implementation project, **Then** the project is saved with its name, hospital/client, and planned date range.
2. **Given** a newly created project, **When** the standard lifecycle is selected, **Then** the project contains the nine implementation phases in the order listed in this specification.
3. **Given** a project phase, **When** its owner or planned dates are changed, **Then** the updated values are visible to project members and persist after reload.
4. **Given** a project manager needs to tailor a plan, **When** they add, rename, reorder, or remove a project-specific phase, **Then** the change affects that project without changing the standard template or other projects.

---

### User Story 2 - Plan and track work on a shared timeline (Priority: P1)

A project manager breaks the implementation phases into tasks, assigns an accountable owner, sets planned dates and dependencies, and tracks progress. Team members use a Gantt-style timeline to understand how phase dates and task dependencies fit together and what is due or at risk.

**Why this priority**: A usable schedule and clear task ownership are central to delivering an implementation across multiple departments and organizations.

**Independent Test**: Add dated tasks to multiple phases, assign owners, create a dependency, and verify that the tasks and phases appear in the timeline with their dates, status, and dependency relationship.

**Acceptance Scenarios**:

1. **Given** a project phase, **When** an authorized member creates a task, **Then** they can provide a title, description, accountable owner, status, planned start and due dates, and optional dependency on another task.
2. **Given** tasks and phases with planned dates, **When** a member opens the project timeline, **Then** the Gantt view groups tasks under phases and represents their planned date ranges and dependencies.
3. **Given** a task has a due date, **When** its due date passes and it is not complete, **Then** it is clearly identified as overdue in the task list and timeline.
4. **Given** a task's dates or status change, **When** the change is saved, **Then** the project summary and timeline show the new values.
5. **Given** a task depends on another task, **When** a member views either task, **Then** the predecessor relationship is visible and the system prevents a task from depending on itself.
6. **Given** a task or phase has an invalid date range, **When** a member attempts to save it, **Then** the system explains the issue and does not save an inconsistent range.

---

### User Story 3 - Collaborate across hospital and vendor teams (Priority: P1)

Hospital and vendor participants work in the same project workspace. They can see who is responsible for work, discuss a task in its context, and review recent project activity without relying on disconnected email threads or spreadsheets.

**Why this priority**: HIS implementations require coordinated decisions and handoffs between hospital departments, implementation leads, and vendor teams.

**Independent Test**: Add two project participants, have one update a task and comment on it, then verify that the other participant can see the update and comment and that each is attributed to its author.

**Acceptance Scenarios**:

1. **Given** a project manager and project participants, **When** a participant opens the project, **Then** they can see the project plan and the people responsible for phases and tasks they are allowed to access.
2. **Given** a project task, **When** an authorized participant adds a comment, **Then** the comment appears with its author and timestamp and remains attached to that task.
3. **Given** a participant changes a project task or phase, **When** the change is saved, **Then** the project activity history records who changed what and when.
4. **Given** a user is not a member of a project, **When** they attempt to open that project's data, **Then** access is denied.

---

### User Story 4 - Track phase deliverables and data readiness (Priority: P2)

A project team tracks whether key outputs for each implementation phase have been prepared, reviewed, and accepted. During Data Gathering and Data Build-Up, the team can track master-data categories and validation/import readiness without using the project planner as a repository for patient records.

**Why this priority**: The guideline emphasizes concrete outputs, stakeholder review, standardized templates, validation, dry-run imports, and a controlled final data freeze. Tracking readiness makes these handoffs visible.

**Independent Test**: Open a project's Data Gathering or Data Build-Up phase, add a deliverable, assign an owner and reviewer, update its status, and verify that its readiness is visible to project members.

**Acceptance Scenarios**:

1. **Given** a phase, **When** a project manager views it, **Then** suggested deliverables relevant to that phase are available as a checklist that can be tailored for the project.
2. **Given** a deliverable, **When** an authorized member updates its owner, status, due date, or review outcome, **Then** the phase shows its current readiness and the change is recorded in project activity.
3. **Given** a Data Gathering or Data Build-Up phase, **When** the team tracks master-data preparation, **Then** they can track categories such as departments, services, users, items, pricing, diagnostic tests, suppliers, and codes by readiness status without entering patient-level records.
4. **Given** a deliverable is awaiting review, **When** its reviewer records approval or requests changes, **Then** the outcome and reviewer are visible to project members.

---

### User Story 5 - Keep project stakeholders and meeting actions organized (Priority: P3)

A project manager keeps a directory of hospital and vendor stakeholders, their project roles, and contact details, and can turn meeting decisions or action items into assigned, dated project tasks.

**Why this priority**: The guideline calls for client and vendor contact lists, communication plans, meeting minutes, attendance, and action items. A directory and task linkage support that coordination, after the core project plan is usable.

**Independent Test**: Add a hospital stakeholder and a vendor stakeholder to the directory, create a meeting action as a task, assign it, and verify that the contact and task are available in the project.

**Acceptance Scenarios**:

1. **Given** a project, **When** an authorized member adds a stakeholder, **Then** they can record the person's name, organization, implementation role, and contact details.
2. **Given** a meeting action, **When** the project manager records it as a task, **Then** it has an owner, due date, status, and phase association like other project work.
3. **Given** a stakeholder who is not an application user, **When** they are added to the directory, **Then** they are recorded as a contact and are not automatically granted access to the project.

## Implementation Lifecycle

The standard template MUST include these phases, in this order:

1. **Kickoff** — align stakeholders on project goals, scope, roles, communication, schedule, and next steps.
2. **Data Gathering** — collect current workflows, forms, reports, systems, and departmental inputs; identify gaps and sources.
3. **Data Build-Up** — prepare, clean, standardize, validate, and review master data; track dry-run readiness and final data freeze.
4. **Requirements Analysis** — document clinical, administrative, and technical needs, workflow gaps, and integration needs.
5. **Training** — identify users by role, assign training, prepare materials, and track sessions or train-the-trainer activities.
6. **Pre-Go-Live** — track readiness checks for data migration, access, infrastructure, checklist completion, and contingency planning.
7. **Go-Live** — mark the planned launch and coordinate the start of live operations.
8. **Post-Go-Live Support** — track early issues, feedback, refresher training, and fixes.
9. **Monitoring & Continuous Improvement** — track usage/KPIs, audits, user feedback, and planned improvements.

The template may include suggested deliverables derived from the guideline, but each project must be able to tailor its deliverables. The template is a starting structure, not a claim that every hospital follows an identical process.

## Edge Cases

- A project has no end date yet, or its schedule changes after work has started.
- A task is overdue, blocked by a predecessor, unassigned, or has a deleted/inactive owner.
- A dependency would create a circular schedule or a task depends on itself.
- A phase is removed or reordered after tasks and deliverables have been attached to it.
- Two participants update the same task around the same time.
- A hospital or vendor stakeholder is a contact but not an authenticated project participant.
- A project has many phases, tasks, comments, or stakeholders and the timeline remains usable.
- A user tries to access a project they do not belong to.
- A user enters patient-identifiable or other clinical-record content into a project description, comment, task, or deliverable. The product is not intended to manage patient records; the plan must define appropriate safeguards and user guidance before implementation.

## Requirements _(mandatory)_

### Functional Requirements

**Project and lifecycle**

- **FR-001**: The system MUST allow an authorized user to create an HIS implementation project with a project name, hospital/client name, and planned date range.
- **FR-002**: The system MUST provide a standard implementation template containing the nine phases listed in this specification, in the listed order.
- **FR-003**: The system MUST allow authorized project members to tailor phases and phase dates for one project without changing the standard template or other projects.
- **FR-004**: A phase MUST support an accountable owner, planned start and end dates, status, and project-specific description.

**Tasks and schedule**

- **FR-005**: The system MUST allow authorized project members to create, edit, assign, complete, and delete tasks within a project phase.
- **FR-006**: A task MUST support a title, description, accountable owner, status, planned start and due dates, and optional predecessor task.
- **FR-007**: The system MUST provide a Gantt-style project timeline that displays phases, tasks, planned date ranges, status, and task dependencies.
- **FR-008**: The system MUST identify overdue incomplete tasks in task and timeline views.
- **FR-009**: The system MUST validate date ranges and prevent self-dependencies and circular task dependencies.
- **FR-010**: The system MUST allow project members to filter or find work by phase, owner, status, and overdue state.

**Collaboration and access**

- **FR-011**: The system MUST allow an authorized project manager to add and remove authenticated users as project participants, subject to the project's access rules.
- **FR-012**: The system MUST allow authorized project participants to comment on tasks, with each comment attributed to its author and creation time.
- **FR-013**: The system MUST retain an activity history for material project, phase, task, and deliverable changes, identifying the actor, change, and time.
- **FR-014**: The system MUST prevent users who are not project participants from viewing or changing project data.

**Deliverables and stakeholder coordination**

- **FR-015**: The system MUST provide suggested, phase-specific deliverables that project managers can tailor per project.
- **FR-016**: A deliverable MUST support an owner, due date, readiness/review status, and review outcome.
- **FR-017**: The system MUST allow the team to track data-preparation categories and their readiness without requiring patient-level records.
- **FR-018**: The system MUST allow authorized participants to maintain a project stakeholder directory, distinct from the list of authenticated project participants.
- **FR-019**: The system MUST allow a meeting action to be recorded as a regular project task linked to a phase.

**Privacy and safety boundary**

- **FR-020**: The system MUST clearly state that the project planner is for HIS implementation coordination and is not a clinical record system.
- **FR-021**: Patient-identifiable health information MUST NOT be required or treated as supported project data. Data collection should be limited to implementation planning and master-data readiness tracking unless a separately reviewed requirement expands this scope.

### Key Entities

- **Implementation Project**: A hospital/client HIS implementation engagement with its participants, lifecycle plan, schedule, and activity.
- **Phase**: A named stage in the implementation lifecycle, with an owner, planned dates, status, tasks, and deliverables.
- **Task**: A unit of project work assigned to an accountable owner, optionally scheduled and dependent on another task.
- **Participant**: An authenticated user who has access to a specific implementation project.
- **Stakeholder Contact**: A hospital or vendor contact associated with the project who may or may not have an application account.
- **Deliverable**: A phase output or readiness item with an owner, due date, status, and review outcome.
- **Comment**: A discussion entry attached to a task and attributed to its author and time.
- **Activity Entry**: A record of a material project change, its actor, and when it occurred.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A project manager can create a project and instantiate its nine-phase plan in under 5 minutes, excluding time spent entering optional details.
- **SC-002**: For a project with 100 dated tasks, a member can identify the phase, owner, due date, status, and dependency of a selected task from the timeline in under 30 seconds.
- **SC-003**: 100% of task, phase, and deliverable changes are attributed to an actor and timestamp in the project activity history.
- **SC-004**: A project member can identify all overdue incomplete tasks using the task list or timeline without manually comparing dates.
- **SC-005**: A user who is not a project participant cannot retrieve project details, tasks, comments, or stakeholder contacts.
- **SC-006**: A team can track the review/readiness status of Data Gathering and Data Build-Up deliverables without entering patient-level health records.

## Assumptions

- The product manages implementation projects for HIS deployments; it does not implement or operate clinical, inventory, or financial HIS modules.
- A new project starts from the nine-phase template, while each project may tailor its own phases and deliverables.
- Hospital/client and vendor personnel may collaborate in one project, subject to project membership and access controls.
- A stakeholder contact is not automatically an application user or project participant.
- Comments on tasks and a recorded activity history are the first collaboration mechanisms; live chat, video meetings, and external email integrations are out of scope for this draft.
- The planner tracks master-data preparation and readiness, not the actual patient record data or full clinical datasets.
- The existing authentication and authorization capabilities in the boilerplate will be reused; project-specific access rules will be defined in the plan.
- Web/desktop use is the initial target. Mobile-specific requirements are not yet defined.

## Clarifications Needed

- Should project members be added only from existing application accounts, or should project managers be able to invite new users by email?
- Does the first release need multiple hospital implementations per client organization, or is each project managed independently?
- Should task comments support @mentions and notifications in the first release, or is an activity feed sufficient?
- Should deliverables support file uploads, or only links and readiness/review status?
- Which project roles (for example, sponsor, client PM, department lead, vendor analyst, trainer, QA) need distinct permissions beyond project membership?
- Are phase names/order and suggested deliverables editable by project managers, or should template changes be restricted to administrators?
