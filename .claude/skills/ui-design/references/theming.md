# Theming and re-branding

All design values live in `apps/web/src/styles/app.css`. Components use them through Tailwind
utilities such as `bg-primary`, `text-muted-foreground`, `border-border` and `rounded-lg`. Token
values never live in component files (constitution, Frontend → UI components).

## How the file is organised

| Block           | Holds                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| `:root`         | Light-mode values                                                                           |
| `.dark`         | Dark-mode values, the same names (`@custom-variant dark` targets `.dark` and its children)  |
| `@theme inline` | Maps each token to a Tailwind utility (`--color-primary: var(--primary)`, the radius scale) |
| `@layer base`   | Page background, text colour and default border colour                                      |

## Tokens

- **Surfaces**: `--background`/`--foreground`, `--card`/`--card-foreground` and
  `--popover`/`--popover-foreground`.
- **Intent**: `--primary`, `--secondary`, `--muted`, `--accent` and `--destructive`, each paired
  with a `-foreground` token where one exists.
- **Lines and focus**: `--border`, `--input` and `--ring`.
- **Sidebar**: `--sidebar`, `--sidebar-foreground` and `--sidebar-border`.
- **Shape**: `--radius`. `@theme inline` derives `rounded-sm`, `rounded-md`, `rounded-lg` and
  `rounded-xl` from it.

Colours use `oklch()`. To add a new semantic colour, such as `--success`, add it to `:root`, to
`.dark` and as a `--color-success` entry in `@theme inline`, then use `bg-success`. Never add a
colour to just one component.

## Re-brand in four steps

1. **Brand colour**: set `--primary` and `--ring` in `:root` and `.dark`. Use the same hue in
   both, usually lighter in `.dark`. Check that `--primary-foreground` still contrasts in both
   modes.
2. **Shape**: set `--radius` in `:root`. The rest of the scale follows from it.
3. **Sidebar** (optional): set `--sidebar`, `--sidebar-foreground` and `--sidebar-border` in both
   blocks to give the navigation its own tone.
4. **Font** (optional): add `--font-sans: "Your Font", ui-sans-serif, system-ui, sans-serif;` to
   `@theme inline`, and load the font in `apps/web/index.html` or with `@import` at the top of
   `app.css`.

## Motion

The app ships without an animation package, so dialogs, drawers and menus open instantly. That
respects reduced-motion settings with no extra code. To add motion, install `tw-animate-css`, add
`@import 'tw-animate-css';` to `app.css`, and the components' `animate-in`/`animate-out` classes
take effect. Keep `motion-reduce:` variants on anything decorative.

## Check it

- Run `npm run dev -w apps/web` and look at a list, a form and the sign-in page in light and dark
  mode.
- Check that body text on `--background`, text on `--primary` and `text-muted-foreground` on cards
  meet a contrast of at least 4.5:1, for example with the browser devtools contrast picker.
- Run `git status`. Only `apps/web/src/styles/app.css` (and `index.html` for a font) changed.
