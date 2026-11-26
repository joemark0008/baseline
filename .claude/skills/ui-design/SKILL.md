---
name: ui-design
description: >-
  House UI rules for apps/web (shadcn/ui on Tailwind 4). Use before building or changing any
  screen, page, form, table, dialog, layout or styling in apps/web, and before re-branding the
  theme. Covers page anatomy, theme tokens, loading/empty/error states, forms, feedback,
  accessibility and a review checklist. Not for API, Prisma or test-only work.
---

# UI design

## Before you start

Stack and layer rules (feature folders, the data layer, import bans, shadcn as the source of
primitives) live in the constitution's **Frontend** section: `.specify/memory/constitution.md`.
Read it first; it wins on any conflict. This skill only answers design questions: how a screen
looks, reads and behaves.

## Workflow

1. **Find the closest reference screen** in the table at the end, and open it. New screens should
   look as if the same person built them.
2. **Check `apps/web/src/components/ui/`** for every control you need. If one is missing, add it
   (see "Adding components") before you write the screen.
3. **Compose the screen** from those components, following the patterns in
   [references/patterns.md](references/patterns.md).
4. **Run [references/checklist.md](references/checklist.md)** on the result. Fix every "no", then
   list any item you broke on purpose in your summary.

### Adding components

- **First choice: the `shadcn` MCP server**, which `.mcp.json` configures at the repo root. Use it
  to search, view and add components from the official catalog. It reads
  `apps/web/components.json`, so components arrive in the project's style, icon set and alias, in
  `apps/web/src/components/ui/`.
- **Fallback: the pinned CLI.** Run `npx shadcn@4.23.0 add <name>` in `apps/web`. Use the same
  version as `.mcp.json`, and when you bump one, bump the other in the same commit. If the MCP
  server suggests an add command with `@latest`, run it with this pinned version instead.
- **If the server is declined or offline**, say so, then run the fallback or ask the developer to
  run it. **Never hand-write an imitation of a catalog component.**
- **To customise a component**, edit it in place in `apps/web/src/components/ui/`. Never copy it
  into a feature folder.

## Core rules

Each rule links to its pattern in [references/patterns.md](references/patterns.md).

1. A page is a fragment that starts with `PageHeader`. The layout owns padding, width and the
   section gap. ([Page anatomy](references/patterns.md#page-anatomy))
2. Use only the existing spacing and type steps, never arbitrary values.
   ([Spacing and type scale](references/patterns.md#spacing-and-type-scale))
3. Colours, radius and surfaces come from theme tokens only, never palette classes, hex or
   `oklch()` in components. ([Theming](references/theming.md))
4. Use library components for every control they cover, never raw `<button>`, `<input>`,
   `<select>`, `<dialog>` or look-alikes. ([Overlays](references/patterns.md#overlays))
5. Group content in `Card` sections, with actions on the right of the header.
   ([Cards](references/patterns.md#cards))
6. Every data view shows loading, empty and error states, and tables use `QueryStateRow`.
   ([Data views](references/patterns.md#data-views-tables-and-lists))
7. Every field has a linked `Label`. Hints and errors sit next to the field, and the submit button
   is disabled while pending. ([Forms](references/patterns.md#forms))
8. Brief success shows as a toast. Errors that need reading show as an inline `Alert`.
   ([Feedback](references/patterns.md#feedback))
9. Design for 375 px first, and wide content scrolls inside its own container, never the page.
   ([Responsive](references/patterns.md#responsive))
10. Give controls accessible names, keep focus visible, and use ARIA roles that are true.
    ([Accessibility](references/patterns.md#accessibility))

## Breaking a rule

If the user explicitly asks for something that breaks a rule, such as a one-off colour or a custom
control, do it. Name the rule you are breaking in your summary, and keep the change to that screen.
Don't turn it into a shared component or a new token unless they ask.

## Re-branding

The brand lives in exactly one place, `apps/web/src/styles/app.css`. A re-brand changes tokens
there, in both the light (`:root`) and dark (`.dark`) blocks, and no component file.
[references/theming.md](references/theming.md) lists the tokens and the steps.

## Reference screens

| Pattern                       | Copy from                                                         |
| ----------------------------- | ----------------------------------------------------------------- |
| Page frame                    | `apps/web/src/layout/AppLayout.tsx`                               |
| Page header                   | `apps/web/src/components/PageHeader.tsx`                          |
| Card with header action       | `apps/web/src/feature/settings/roles/index.tsx`                   |
| Table with three states       | `apps/web/src/feature/settings/roles/index.tsx`                   |
| Table state row               | `apps/web/src/components/QueryStateRow.tsx`                       |
| Form                          | `apps/web/src/feature/settings/account/ChangePasswordForm.tsx`    |
| Inline error for a known case | `apps/web/src/components/RateLimitAlert.tsx`                      |
| Public screen frame           | `apps/web/src/layout/PublicLayout.tsx`                            |
| Sidebar, drawer, breadcrumbs  | `apps/web/src/layout/AppSidebar.tsx`                              |
| Navigation entries            | `apps/web/src/lib/navigation.ts`                                  |
| Destructive confirmation      | `apps/web/src/components/ConfirmDialog.tsx`                       |
| Row actions menu              | `apps/web/src/feature/admin/users/components/UserRow.tsx`         |
| Modal with one-time content   | `apps/web/src/feature/admin/users/components/ResetLinkDialog.tsx` |
| Success toasts                | `apps/web/src/feature/admin/users/index.tsx`                      |
| Simple card page              | `apps/web/src/feature/dashboard/index.tsx`                        |
