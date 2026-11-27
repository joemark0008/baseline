# Quickstart: Project Org Chart

## Run

Sign in at https://baseline-dev.joemarkgimeno.com (live dev) or locally with `npm run dev:api`
and `npm run dev:web`. You need `projects:view` and `projects:add` (Admin has both). Design
details: `data-model.md`, `contracts/graphql.md`.

## Validate end to end

1. **Pre-populated chart** (US2, FR-005): Projects › New project. Open the new **Org chart** tab:
   the 12 suggested departments are listed, every one marked **Unassigned**, and the header
   shows "12 unassigned".
2. **Build the hierarchy** (US2): Add department "Medical Services"; edit "Laboratory" and set
   its parent to Medical Services; add "Blood Bank" under Laboratory. Reload: the tree persists.
   Try to move Medical Services under Blood Bank: the dialog shows "A department cannot be moved
   under one of its own sub-departments". Add "pharmacy" (lower case): refused as a duplicate.
3. **Assign point persons** (US2, US1): On Pharmacy › Assign point person, pick an existing
   stakeholder; on Laboratory choose "New contact…", fill name, organization, role, email, phone,
   and it is assigned on save. The cards show name, role, email and phone; the unassigned count
   drops by two. Activity lists "set … as point person for Pharmacy".
4. **Participant badge** (FR-008): link a stakeholder to a user who is a project member
   (Stakeholders › Edit › account); their card on the chart shows **Participant**.
5. **Alternate** (US3): add an alternate to Pharmacy; both show, point person marked primary.
   Clear Pharmacy's point person: the department is Unassigned again although the alternate stays.
6. **Search** (FR-013): type "blood" and only Blood Bank (with its ancestors) remains; type a
   point person's name and their departments remain.
7. **Remove with children** (FR-004): remove Laboratory, choose "Keep sub-departments": Blood
   Bank now sits under Medical Services. Remove Medical Services, choose "Remove them too":
   the subtree is gone.
8. **Automatic unassignment** (FR-010): remove the stakeholder who is Pharmacy's point person in
   the Stakeholders tab; Pharmacy is Unassigned.
9. **Tag work** (US4): Tasks › New task, choose department Pharmacy; the task detail shows
   "Pharmacy · point person <name> · <email>". Change Pharmacy's point person; reopen the task:
   it shows the new person. Pharmacy's card shows "1 open task".
10. **Older project** (edge case): on a project created before this feature the chart is empty
    and offers "Start from the suggested list"; a second click is refused.
11. **Member view** (FR-011): as a Member the tab is read-only (no add, assign or remove
    controls); as a non-member the project URL is "Not found".
12. **Admin list** (FR-005): Settings › Template › Suggested departments: rename, reorder, add,
    remove. A project created afterwards uses the new list; existing charts do not change.

## Verify

```sh
npm test -w apps/api                                            # departments.service, department-template.service, resolver specs
DATABASE_URL=<baseline_dev url> npm run test:e2e -w apps/api    # org-chart.e2e-spec.ts
npm run schema:check
npm run codegen -w apps/web && npm test -w apps/web -- --run    # lib.test.ts (tree, filter), OrgChartTree.test.tsx
npm run typecheck && npm run lint && npm run build
```
