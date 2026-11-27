# Feature Specification: Project Org Chart

**Feature Branch**: `009-project-org-chart`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "every project should have project org chart to idetify the point person for departments"

**Builds on**: `specs/007-his-implementation` (implementation project workspace, participants, stakeholder directory, activity history).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Find the point person for a department (Priority: P1)

A project participant (hospital or vendor side) opens a project's org chart to find out who to contact for a given hospital department, for example Pharmacy, Laboratory, Billing or Nursing. The chart shows each department, its point person, and how to reach them, so nobody has to ask around or dig through email threads.

**Why this priority**: Identifying the right contact per department is the stated purpose of the feature. Everything else exists to keep that answer accurate.

**Independent Test**: Open a project whose org chart has at least three departments with point persons, locate a named department, and confirm the point person's name, role and contact details are visible without leaving the chart.

**Acceptance Scenarios**:

1. **Given** a project with departments and assigned point persons, **When** a participant opens the project's org chart, **Then** every department is shown with its point person's name, role/title and available contact details (email and/or phone).
2. **Given** a department has no point person, **When** the chart is viewed, **Then** that department is clearly marked as unassigned so the gap is obvious.
3. **Given** a project with many departments, **When** a participant searches or filters by department name or person name, **Then** the matching departments are shown and the rest are hidden.
4. **Given** a point person who is also a project participant, **When** they are shown on the chart, **Then** the chart indicates that they have access to the project (as opposed to being a contact only).
5. **Given** a user who is not a participant of the project, **When** they try to view the org chart, **Then** access is denied.

---

### User Story 2 - Build and maintain the org chart (Priority: P1)

A project Manager sets up the org chart for a new project: adds the departments involved in the implementation, arranges them in a hierarchy (for example Medical Services → Laboratory → Blood Bank), and assigns one point person per department from the project's stakeholder directory, creating the contact on the spot if it does not exist yet. As people change during the implementation, the Manager updates the chart.

**Why this priority**: Without a maintained chart, Story 1 shows nothing useful. Setup must be quick, otherwise the chart will stay empty.

**Independent Test**: As a Manager, create five departments including one nested under another, assign point persons to four of them, then reopen the project and verify the structure and assignments persist and the fifth department shows as unassigned.

**Acceptance Scenarios**:

1. **Given** a new project, **When** the Manager opens the org chart for the first time, **Then** it is pre-populated with a suggested list of common hospital departments that the Manager can keep, rename, remove or extend.
2. **Given** the org chart, **When** the Manager adds a department, **Then** they can give it a name, an optional parent department, an optional description, and the chart shows it in its place.
3. **Given** a department, **When** the Manager assigns a point person, **Then** they can pick an existing stakeholder contact or create a new contact (name, organization, role, email, phone) without leaving the org chart, and the assignment is shown immediately.
4. **Given** a department with a point person, **When** the Manager replaces or removes the point person, **Then** the department shows the new person or becomes unassigned, and the change is recorded in the project activity history with actor and time.
5. **Given** a department that has sub-departments, **When** the Manager removes it, **Then** the system asks what to do with the sub-departments (move them up one level or remove them too) and does not silently delete them.
6. **Given** a department, **When** the Manager tries to set its parent to itself or to one of its own sub-departments, **Then** the system refuses and explains why.
7. **Given** a Member (not a Manager), **When** they open the org chart, **Then** they can view it but cannot add, change or remove departments or point persons.

---

### User Story 3 - Record an alternate contact per department (Priority: P2)

For departments where the point person is often unavailable (shift work, leave), the Manager records an alternate contact so that the implementation team still knows who to reach.

**Why this priority**: Useful for hospital operations but not needed for a usable first chart.

**Independent Test**: Assign both a point person and an alternate to a department, then view the chart and confirm both are shown, with the point person clearly identified as primary.

**Acceptance Scenarios**:

1. **Given** a department with a point person, **When** the Manager adds an alternate contact, **Then** the chart shows both, with the point person marked as primary.
2. **Given** a department with only an alternate and no point person, **When** the chart is viewed, **Then** the department is still marked as unassigned (an alternate does not fill the primary role).

---

### User Story 4 - See the point person from project work (Priority: P3)

When a task or deliverable concerns a specific department (for example "Collect Pharmacy item master"), a participant tags it with that department and can see the department's point person directly from the task or deliverable.

**Why this priority**: Connects the chart to daily work, but the chart is valuable on its own first.

**Independent Test**: Tag a task with a department that has a point person, open the task, and confirm the point person's name and contact details are shown.

**Acceptance Scenarios**:

1. **Given** a task or deliverable, **When** an authorized member sets its department, **Then** the department's current point person is shown on that task or deliverable.
2. **Given** a department's point person changes, **When** a tagged task is viewed afterwards, **Then** it shows the new point person without any edit to the task.
3. **Given** the org chart, **When** a participant views a department, **Then** they can see how many open tasks and deliverables are tagged with it.

---

## Edge Cases

- A stakeholder contact who is a point person is removed from the stakeholder directory: the affected departments become unassigned and the chart flags them.
- The same person is the point person for several departments (allowed, shown on each).
- Two departments in the same project have the same name (prevented; names are unique within a project, case-insensitive).
- A department's parent is removed or re-parented, creating a potential cycle (prevented).
- A project is created before this feature exists: its org chart starts empty and offers the suggested department list on first open.
- A Manager tailors the suggested list heavily (removes all suggestions) and builds a chart from scratch.
- A large chart (50+ departments, 4 levels deep) remains readable and navigable, including on a laptop screen.
- A point person's contact details are missing (no email or phone): the chart shows the name and marks contact details as not recorded.
- A participant enters patient-identifiable information into a department description or contact notes: the existing privacy boundary of the project workspace applies (not supported data).

## Requirements _(mandatory)_

### Functional Requirements

**Chart structure**

- **FR-001**: Every implementation project MUST have exactly one org chart, available from the project workspace to all project participants.
- **FR-002**: An org chart MUST consist of departments. A department MUST have a name (unique within the project, case-insensitive), MAY have a description, and MAY have one parent department, forming a tree of any practical depth.
- **FR-003**: The system MUST prevent a department from being its own ancestor (no cycles) and MUST keep department order stable within a parent so the chart renders consistently.
- **FR-004**: When a department with sub-departments is removed, the Manager MUST choose between moving the sub-departments to the removed department's parent or removing them too; the system MUST NOT remove sub-departments silently.
- **FR-005**: A new project's org chart MUST be pre-populated with an administrator-maintained suggested list of common hospital departments. Changes to the suggested list affect projects created afterwards only. A Manager MAY keep, rename, remove or add departments freely for their project.

**Point persons**

- **FR-006**: A department MAY have at most one point person and at most one alternate contact. Both MUST be stakeholder contacts from the same project's stakeholder directory.
- **FR-007**: The system MUST allow a Manager to create a new stakeholder contact (name, organization, role/title, email, phone) while assigning a point person, without leaving the org chart.
- **FR-008**: The chart MUST show, for each department, the point person's name, role/title and recorded contact details, and whether the person is a project participant (has an account with access to the project).
- **FR-009**: A department without a point person MUST be visibly marked as unassigned, regardless of whether an alternate is set. The chart MUST show a count of unassigned departments.
- **FR-010**: If a stakeholder contact is removed from the directory, every department referencing them MUST become unassigned (or lose its alternate) automatically.

**Access and history**

- **FR-011**: Only project Managers MAY add, edit, reorder or remove departments and assign or change point persons and alternates. Members MAY view the chart. Non-participants MUST be denied access to the chart.
- **FR-012**: Adding, renaming, re-parenting or removing a department and assigning, replacing or removing a point person or alternate MUST be recorded in the project activity history with actor, change and time.

**Finding people**

- **FR-013**: Participants MUST be able to search or filter the chart by department name and by person name.
- **FR-014**: A participant MUST be able to open a point person's full stakeholder record from the chart.

**Link to project work** (User Story 4)

- **FR-015**: A task or deliverable MAY be tagged with one department of the same project. Where tagged, the task or deliverable MUST display the department's current point person (resolved at view time, not copied).
- **FR-016**: A department in the chart MUST show the number of open (not completed) tasks and deliverables tagged with it.

### Key Entities

- **Org Chart**: The department tree of one implementation project. One per project; exists implicitly once the project exists.
- **Department**: A hospital (or vendor) unit involved in the implementation, with a name, optional description, optional parent department, display order, an optional point person and an optional alternate contact.
- **Point Person**: The stakeholder contact accountable as the single contact for a department. Reuses the existing Stakeholder Contact entity; may or may not be an application user.
- **Alternate Contact**: A second stakeholder contact for a department, used when the point person is unavailable.
- **Suggested Department List**: The administrator-maintained starting list of common hospital departments copied into a new project's chart.
- **Stakeholder Contact** (existing): A hospital or vendor contact in the project's directory.
- **Task / Deliverable** (existing): Gains an optional department tag.
- **Activity Entry** (existing): Records org chart changes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A participant can identify the point person and contact details for any named department in a project with up to 50 departments in under 15 seconds from opening the project.
- **SC-002**: A Manager can set up an org chart of 10 departments with point persons, starting from the suggested list and an existing stakeholder directory, in under 10 minutes.
- **SC-003**: 100% of departments without a point person are visibly flagged, and the total count of unassigned departments is shown on the chart.
- **SC-004**: 100% of department and point-person changes appear in the project activity history with actor and time.
- **SC-005**: A user who is not a project participant cannot retrieve any department or point person data for that project.
- **SC-006**: Removing a stakeholder contact never leaves a department pointing at a person who no longer exists in the directory.

## Assumptions

- "Department" means a hospital unit or service (clinical, administrative or support) involved in the HIS implementation; vendor teams can also be modelled as departments when useful, since stakeholder contacts already carry an organization.
- One point person per department is the intended model: the chart answers "who is the single accountable contact", not "who works there". A full staff directory is out of scope.
- Point persons are stakeholder contacts, not necessarily application users, consistent with the existing stakeholder directory. Assigning someone as a point person does not grant project access.
- The suggested department list follows the same administrator-maintained template pattern as the implementation lifecycle (spec 007). The initial list is a reasonable set of common hospital departments (for example Administration, Medical Records, Nursing, Pharmacy, Laboratory, Radiology, Billing/Cashier, IT, Supply/Inventory, Emergency, Outpatient, Inpatient) and is tailored per project; the exact initial list is decided during planning.
- The chart is a tree (one parent per department). Matrix structures and multiple reporting lines are out of scope.
- Viewing is web/desktop first; printing or exporting the chart (PDF, image) is out of scope for this release.
- Org chart changes do not send email notifications; the in-app activity history is the record.
- Existing project roles (Manager / Member) and the existing project access rules from spec 007 are reused unchanged.
