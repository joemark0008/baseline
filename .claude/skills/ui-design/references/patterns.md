# UI patterns

Each pattern gives the rule, a short code shape and the file to copy from. When a pattern and a
reference file disagree, the reference file is out of date, so fix the file rather than copy it.

## Page anatomy

`AppLayout` already owns the page frame: the catalog `Sidebar` in its inset variant, a top bar
with the sidebar toggle and breadcrumbs, `p-4 sm:p-6` padding, `max-w-[1440px]` and a `flex-col
gap-6` stack. A page renders a fragment that starts
with `PageHeader`, followed by its sections. It never adds its own outer padding, width or gap.

```tsx
export function ThingsPage() {
  return (
    <>
      <PageHeader title="Things" description="One sentence on what this page is for." />
      <Card>…</Card>
    </>
  )
}
```

Below `md`, the same sidebar opens as a drawer from the top bar's toggle. Navigation is defined
only in `apps/web/src/lib/navigation.ts`:

- A page is one entry in `protectedNavLinks`. Give it `items` to make an expandable section, and
  `requires` to hide it from people without the permission.
- A detail page that isn't in the navigation (an editor, a "new" form) gets one line in
  `DETAIL_CRUMBS`, so its breadcrumb reads "Edit role" rather than an id.

The sidebar, the drawer and the breadcrumbs all derive from it through `lib/nav-model.ts`. Don't
add links to the sidebar components directly.

Public screens (signed out) render inside `PublicLayout`, which provides the muted background, the
brand and a centred `max-w-sm` column. A public page returns just its card or cards.

Reference: `apps/web/src/components/PageHeader.tsx`, `apps/web/src/layout/AppLayout.tsx`,
`apps/web/src/layout/AppSidebar.tsx`, `apps/web/src/layout/PublicLayout.tsx`.

## Spacing and type scale

Stay on the steps the app already uses. Don't use arbitrary values like `gap-[18px]` or
`text-[15px]`.

| Use                              | Class                                   |
| -------------------------------- | --------------------------------------- |
| Between page sections            | `gap-6` (from the layout)               |
| Between form fields, card blocks | `gap-4`                                 |
| Label to control, button groups  | `gap-2`                                 |
| Title to description             | `gap-1` / `gap-1.5`                     |
| Page title                       | `text-2xl font-semibold tracking-tight` |
| Body text, tables                | `text-sm`                               |
| Hints, secondary text            | `text-xs text-muted-foreground`         |

## Cards

Group a page's content into `Card` sections. Use `CardHeader` with `CardTitle` and an optional
`CardDescription`, then `CardContent`. Header actions sit on the right:
`CardHeader className="flex flex-row items-start justify-between gap-4"`.

Reference: `apps/web/src/feature/dashboard/index.tsx`, `apps/web/src/feature/settings/roles/index.tsx`.

## Data views (tables and lists)

Every list has three non-data states. `QueryStateRow` renders the right one, in the order error,
then loading, then empty. Don't render data rows while there is an error.

```tsx
const { data, loading, error } = useQuery(THINGS)
<TableBody>
  <QueryStateRow
    colSpan={3}
    loading={loading && !data}
    error={error?.message ?? null}
    isEmpty={data?.things.length === 0}
    emptyMessage="No things yet."
  />
  {(error ? [] : (data?.things ?? [])).map((t) => <TableRow key={t.id}>…</TableRow>)}
</TableBody>
```

- Right-align numeric columns (`text-right`) and put secondary columns in `text-muted-foreground`.
- Make the main column a `Link` to the detail page (`font-medium hover:underline`).
- Show tags and statuses with `Badge`. Use `variant="outline"` for neutral labels and the default
  variant for emphasis.
- `Table` already scrolls sideways inside its container, so don't wrap it in another scroller.

Reference: `apps/web/src/feature/settings/roles/index.tsx`, `apps/web/src/components/QueryStateRow.tsx`.

## Forms

- Lay forms out as `form className="flex max-w-sm flex-col gap-4"`, with one
  `div className="flex flex-col gap-2"` per field.
- Every field gets a `Label` with `htmlFor` that matches the control's `id`. Set `autoComplete`
  and native constraints (`required`, `minLength`) where they apply.
- Hints go under the field as `p className="text-xs text-muted-foreground"`.
- Form-level errors go in `Alert variant="destructive" role="alert"` above the submit button.
  Confirmations go in `Alert role="status"`.
- The submit button is `type="submit"`, `disabled` while pending, and `className="self-start"`.

Reference: `apps/web/src/feature/settings/account/ChangePasswordForm.tsx`.

## Feedback

| Situation                                       | Use                                                  |
| ----------------------------------------------- | ---------------------------------------------------- |
| A brief success after an action ("Invite sent") | `toast.success('…')` from `sonner`                   |
| An error the user must read or act on           | `Alert variant="destructive" role="alert"` inline    |
| A lasting confirmation inside a form            | `Alert role="status"`                                |
| A specific known failure (rate limiting)        | the matching shared component, e.g. `RateLimitAlert` |

The `Toaster` is mounted once in `apps/web/src/routes/__root.tsx`, so don't mount another one.

Reference: `apps/web/src/components/ui/sonner.tsx`, `apps/web/src/components/RateLimitAlert.tsx`.

## Overlays

Use the library's `Dialog`, `AlertDialog`, `Sheet`, `Popover` and `DropdownMenu`. Add them first
if they're missing (see "Adding components" in `SKILL.md`).

- **Destructive actions always ask first.** Use `ConfirmDialog`, which is controlled. Its title
  names the target ("Deactivate Bo?"), its description says what will happen, and its confirm
  button is destructive. `onConfirm` resolves to an error message or `null`. On an error the
  dialog stays open and shows it; on success it closes and the page toasts.

  ```tsx
  const [confirming, setConfirming] = useState(false)
  <ConfirmDialog
    open={confirming}
    onOpenChange={setConfirming}
    title={`Delete ${thing.name}?`}
    description="This can't be undone."
    confirmLabel="Delete"
    onConfirm={() => run(() => deleteThing(...), `${thing.name} deleted`)}
  />
  ```

- **Rows with more than two actions** put them in a `DropdownMenu` behind a ghost icon button
  labelled `Actions for <name>`. The destructive item uses `variant="destructive"` and opens a
  `ConfirmDialog`. Never put an `AlertDialogTrigger` inside a menu item, because the menu
  unmounts when it closes.
- **Content shown once**, such as a secret link, goes in a modal `Dialog` that says it won't be
  shown again.

Reference: `apps/web/src/components/ConfirmDialog.tsx`,
`apps/web/src/feature/admin/users/components/UserRow.tsx`,
`apps/web/src/feature/admin/users/components/ResetLinkDialog.tsx`.

## Responsive

- Design for 375 px first. Stack anything side by side below `sm`, for example
  `flex flex-col gap-2 sm:flex-row`.
- Never cause horizontal page scroll. Wide content scrolls inside its own container.

## Accessibility

- An icon-only button gets an `aria-label`. Decorative icons get `aria-hidden`.
- Keep the components' focus rings, and never remove an `outline` without replacing it.
- Roles must describe what the element is: `dialog` for real modals only, `alert` for errors,
  `status` for confirmations, `region` with a label for an inline panel.
- Use tokens for colour, which keeps contrast valid in both modes. Don't put
  `text-muted-foreground` on a `bg-muted` surface for important text.
