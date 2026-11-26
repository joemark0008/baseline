# UI review checklist

Run this before you call a screen done. Answer each question yes or no from the code or the
running screen. A screen **passes only when every item that applies is a yes**. Name any item
that doesn't apply, along with the reason, and name any item you broke on purpose (item 14).

## Structure

1. Does the page start with `PageHeader`, with a title and, where it helps, a description?
2. Does the content sit in the layout's vertical stack, without adding its own outer padding or
   max width?
3. Does every control the library provides come from `apps/web/src/components/ui/`, with no raw
   `<button>`, `<input>`, `<select>` or `<dialog>` and no hand-made look-alike?

## Tokens

4. Is the screen free of hard-coded colours? That means no palette classes such as
   `bg-blue-500`, and no hex, `rgb()` or `oklch()` values outside `apps/web/src/styles/app.css`.
5. Do radius, shadows and surfaces come from tokens and component defaults, with no arbitrary
   values like `rounded-[7px]`?
6. Does the screen read correctly in both light and dark mode?

## States

7. Does every data view handle loading, empty and error? Tables use `QueryStateRow`.
8. Is each submit button disabled while its mutation is pending, and does a failure show inline
   (an `Alert`) or as a toast?

## Forms

9. Does every field have a visible `Label` linked to its control (`htmlFor` and `id`), with
   hints and validation messages next to the field?

## Accessibility

10. Does every icon-only control have an accessible name (`aria-label` or `sr-only` text)?
11. Is focus visible, and does the whole flow work with the keyboard alone?
12. Do ARIA roles describe what the element really is? For example, `role="dialog"` only on a
    real modal, `role="alert"` for errors and `role="status"` for confirmations.

## Responsive

13. Is the screen usable at 375 px wide with no horizontal page scroll, and do wide tables scroll
    inside their own container (the `Table` component does this)?

## Departures

14. Is every rule broken at the user's request named in the change summary, and kept to this
    screen?
