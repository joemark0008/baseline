# his-project-planner

A full-stack starter: a **NestJS GraphQL API** and a **React (Vite) web app**, with invitation-only
sign-in and Postgres through Prisma. It ships as two Docker images (`api` and `web`) that run on
any host that runs containers.

Out of the box you get:

- Sign-in with email or username + password (Google optional) and invitation-only sign-up.
- Roles and permissions you design in the app: each role is a grid of features × View, Add,
  Edit, Delete, and each person has one role. Admin (everything) and Member (nothing ticked)
  are built in.
- A users screen to invite people, change their role, edit or deactivate them.
- A health check, CI (lint, format, types, tests, build, Docker images) and Renovate.
- Working examples to copy: the `invites` and `users` API features, with unit and end-to-end
  tests.

The project rules (stack, folder layout, tests, review checklist) live in
[`.specify/memory/constitution.md`](.specify/memory/constitution.md). Read it before writing code.

**Contents**


- [Run it on your machine](#run-it-on-your-machine)
- [Everyday commands](#everyday-commands)
- [Add a feature](#add-a-feature)
- [Before you push](#before-you-push)
- [Where things live](#where-things-live)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)


## Run it on your machine

You need **Node 22** and **Docker** (for Postgres). Commands run from the repository root.

**1. Install dependencies**

```sh
npm install
```

**2. Start Postgres** (skip if you already have Postgres 16 running on port 5432)

```sh
docker run -d --name postgres16 -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
```

**3. Create the database and its user.** Pick a password and use it in both places below.

```sh
docker exec -i -e PGPASSWORD=postgres postgres16 psql -h 127.0.0.1 -U postgres <<'SQL'
CREATE ROLE his_project_planner LOGIN NOSUPERUSER CREATEDB PASSWORD 'change-me';
CREATE DATABASE his_project_planner OWNER his_project_planner;
SQL
```

(`CREATEDB` lets Prisma create its temporary "shadow" database during migrations.)

**4. Create `.env`** in the repository root with these local values:

```sh
cat > .env <<EOF
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://his_project_planner:change-me@localhost:5432/his_project_planner
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=http://localhost:3001
WEB_ORIGINS=http://localhost:4173
COOKIE_DOMAIN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
VITE_API_URL=http://localhost:3001
VITE_ENABLE_GOOGLE_AUTH=false
EOF
```

`.env` is git-ignored and loaded automatically by the API, Prisma and Vite. If you run npm inside
a Docker container, use `host.docker.internal` instead of `localhost` in `DATABASE_URL`.

**5. Create the tables**

```sh
npm run db:migrate -w apps/api
```

**6. Start the app** in two terminals:

```sh
npm run dev:api   # API: http://localhost:3001   (GraphQL explorer: http://localhost:3001/graphql)
npm run dev:web   # Web: http://localhost:4173
```

The API log shows `Setup token: …`. Open http://localhost:4173, paste it, and create your admin
account. This happens once per database; after that you sign in normally and invite others from
**Admin → Users**.

**Lost the setup token?** Run `npm run setup:token -w apps/api` (on the server:
`npm run setup:token:prod` inside the API container), or restart the API. Either prints a new
token; older ones stop working.

**Something wrong?**

| Error                                                 | Fix                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| `The datasource.url property is required`             | `.env` is missing or has no `DATABASE_URL` (step 4).                  |
| `Can't reach database server` / `ECONNREFUSED :5432`  | Postgres isn't running (step 2), or the host is wrong in the URL.     |
| `password authentication failed`                      | The password in `DATABASE_URL` doesn't match the one in step 3.       |
| `Missing required environment variable ...`           | Add that variable to `.env`.                                          |
| Sign-in works but the web app shows you as signed out | `WEB_ORIGINS` must be `http://localhost:4173`; `COOKIE_DOMAIN` empty. |
| `Invalid setup token`                                 | Copy the latest token from the API log, or run `npm run setup:token`. |

## Everyday commands

| Command                                  | What it does                                                 |
| ---------------------------------------- | ------------------------------------------------------------ |
| `npm run dev:api` / `npm run dev:web`    | Start the API / web app with live reload                     |
| `npm test`                               | Unit tests (API and web)                                     |
| `npm run test:e2e -w apps/api`           | End-to-end tests against your local database                 |
| `npm run lint` / `npm run format`        | Check code style / fix formatting                            |
| `npm run typecheck`                      | TypeScript check for both apps                               |
| `npm run db:migrate -w apps/api`         | Create and apply a migration after editing the Prisma schema |
| `npm run db:studio -w apps/api`          | Browse the database in Prisma Studio                         |
| `npm run setup:token -w apps/api`        | Print a new first-run setup token (before setup only)        |
| `npm run schema:generate`                | Rebuild `apps/api/schema.graphql` after changing the API     |
| `npm run codegen`                        | Rebuild the web app's GraphQL types                          |
| `npm run g -w apps/api -- <type> <name>` | Generate API code with the Nest CLI (`nest g`)               |

## Add a feature

There are two ways: let Spec Kit plan and build it with Claude Code (recommended), or build it by
hand.

### With Spec Kit

Spec Kit turns a plain description into a spec, a plan and a task list, then builds it, following
the rules in the constitution. Run these commands in Claude Code, one at a time, and read what
each one writes before running the next.

**Workflow**

```text
/speckit-specify   →  /speckit-clarify  →  /speckit-plan  →  /speckit-tasks  →  /speckit-analyze  →  /speckit-implement
   what & why          fill the gaps         how (tech)        the to-do list      consistency check     build it
                       (optional)                                                   (optional)
```

| Step | Command                      | You give it                       | It writes (in `specs/NNN-<feature>/`)                                    |
| ---- | ---------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| 1    | `/speckit-specify <idea>`    | What users need and why. No tech. | `spec.md`: user stories, requirements, success criteria                  |
| 2    | `/speckit-clarify`           | Answers to up to 5 questions      | Updates `spec.md` with your answers                                      |
| 3    | `/speckit-plan <tech notes>` | Optional technical hints          | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| 4    | `/speckit-tasks`             | Nothing                           | `tasks.md`: ordered, checkable tasks                                     |
| 5    | `/speckit-analyze`           | Nothing                           | A report of gaps or contradictions (changes no files)                    |
| 6    | `/speckit-implement`         | Optional: which tasks to run      | The code and tests; ticks tasks off in `tasks.md`                        |

Features are numbered in order: the first one goes in `specs/001-<feature>/`, the next in
`specs/002-…`, and so on. Commit the `specs/` folder with the code.

**Sample: an orders feature**

```text
/speckit-specify Signed-in users can place orders for products. An order has one or more
line items (product, quantity, unit price) and a status: draft, submitted, cancelled. Users see
only their own orders in a paginated list, newest first. People whose role allows it can see
every order and cancel any order that is not already cancelled.
```

Spec Kit writes `specs/001-orders/spec.md` and may mark open questions as
`[NEEDS CLARIFICATION]`. Answer them:

```text
/speckit-clarify
```

> Example question: "Can a submitted order still be edited?" → answer `No, only drafts can be
edited`.

Then plan, using this stack (the constitution already fixes it, so the notes can be short):

```text
/speckit-plan New Nest module `orders` with a Prisma model and migration, GraphQL queries
myOrders and findAllOrders (orders:view) using the shared PageArgs/Paginated pagination, and
mutations createOrder, submitOrder and cancelOrder (orders:delete for cancelling someone else's).
Declare the `orders` area in orders.access.ts. Web page under feature/orders.
```

Generate the tasks, check them, and build:

```text
/speckit-tasks
/speckit-analyze
/speckit-implement
```

`/speckit-implement` works through `tasks.md` in order, writing tests alongside the code. When it
finishes, run the [checks](#before-you-push), try the feature in the browser, and commit.

**Other commands**

| Command                          | When to use it                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `/speckit-checklist <focus>`     | Generate a review checklist for the feature, e.g. `/speckit-checklist security`   |
| `/speckit-converge`              | After building, compare the code with the spec and add tasks for anything missing |
| `/speckit-constitution <change>` | Change the project rules (stack, layout, tests). Rarely needed                    |

**Tips**

- Describe _what_ and _why_ in `/speckit-specify`; leave technology for `/speckit-plan`.
- One feature per spec. Small, focused specs build more reliably than big ones.
- Read and edit the generated files: they are yours. Re-run a step after editing its input.
- To resume later, just run the next command. `/speckit-specify` records the current feature in
  `.specify/feature.json`, and the other commands work on that feature.

### Building UI

Claude Code loads the project skill [`ui-design`](.claude/skills/ui-design/SKILL.md) on its own
whenever it builds or changes a screen. The skill holds the house rules: page layout, theme
tokens, loading, empty and error states, forms and accessibility. Two parts of it are useful to
read yourself:

- [Re-branding](.claude/skills/ui-design/references/theming.md): the brand lives only in
  `apps/web/src/styles/app.css`.
- [Review checklist](.claude/skills/ui-design/references/checklist.md): run it on any new screen.

The first time you open the repo, Claude Code asks you to approve the `shadcn` MCP server from
`.mcp.json`. Approve it, and Claude can add real shadcn components to
`apps/web/src/components/ui/` instead of writing its own. Without it, add components with
`npx shadcn@4.23.0 add <name>` in `apps/web`.

The official shadcn skill (`npx skills add shadcn/ui`) is an optional personal install that
teaches the shadcn CLI and APIs. It isn't committed here.

### By hand

Example: an `orders` feature.

1. **Database** – add the model in a new file, `apps/api/prisma/schema/orders.prisma`, then:

   ```sh
   npm run db:migrate -w apps/api -- --name add-orders
   ```

2. **Generate the API files** with the Nest CLI:

   ```sh
   npm run g -w apps/api -- module orders     # orders.module.ts (added to AppModule)
   npm run g -w apps/api -- service orders    # orders.service.ts + orders.service.spec.ts
   npm run g -w apps/api -- resolver orders   # orders.resolver.ts + orders.resolver.spec.ts
   ```

3. **Fill them in** – copy the patterns from `apps/api/src/users` and `apps/api/src/invites`:
   - `entities/order.entity.ts` – the GraphQL type (`@ObjectType`).
   - `dto/create-order.input.ts` – inputs (`@InputType` with `class-validator` rules).
   - `orders.service.ts` – the logic; inject `PrismaService` and use `this.prisma.client.order`.
   - `orders.resolver.ts` – thin: read the arguments, call the service. Everything requires
     sign-in unless marked `@AllowAnonymous()`; protect it with
     `@RequirePermission('orders', 'view')` (see **Protect a new feature** below).
   - Lists use the shared pagination: take `@Args() pageArgs: PageArgs`, return
     `class OrdersPage extends Paginated(Order) {}`, and build it with `toPageQuery()` +
     `buildPageMeta()` (see `UsersService.findAll`).
   - Write the specs, and add a case to `apps/api/test/app.e2e-spec.ts`.

4. **Publish the API schema** – add the resolver to `apps/api/src/graphql/resolvers.ts`, then:

   ```sh
   npm run schema:generate
   ```

5. **Web** – add the page under `apps/web/src/feature/orders/` with its queries in
   `operations.ts` (use the `graphql()` tag), add a one-line route file under
   `apps/web/src/routes/`, then run `npm run codegen`.

## Before you push

Run what CI runs. All must pass:

```sh
npm run lint && npm run format:check && npm run typecheck && npm test \
  && npm run test:e2e -w apps/api && npm run build && npm run schema:check
```

`schema:check` fails if `apps/api/schema.graphql` changed and isn't committed: commit it with your
change.

## Where things live

```text
apps/api/                     NestJS 12 · GraphQL (code-first) · Prisma 7 · Better Auth
  prisma/schema/              database models, one <feature>.prisma per feature; migrations in prisma/migrations/
  src/<feature>/              one folder per feature: module, resolver, service, dto/, entities/
  src/common/pagination/      PageArgs, PageMeta, Paginated(), toPageQuery(), buildPageMeta()
  src/auth/                   Better Auth setup and the invite-only sign-up hook
  test/                       end-to-end tests
  schema.graphql              generated GraphQL schema (committed)
apps/web/                     React 19 · Vite 8 · TanStack Router · shadcn/ui · Apollo Client 4
  src/feature/<area>/         pages, components and their GraphQL operations
  src/routes/                 one-line route files; _protected.tsx guards signed-in pages
  src/graphql/codegen/        generated types (don't edit)
.specify/memory/constitution.md   the project rules
scripts/init.sh               turns the boilerplate into a named project
```

**Screens that ship:** `/login`, `/admin/users` (invite people, change their role, edit or
deactivate them), `/settings/roles` (design roles) and `/settings/roles/history` (who changed
what), `/invite` (the link an invitee opens to sign up), `/auth/callback` (where every sign-in
lands). Sign-up without an invite is rejected by the API.

## Roles and permissions

Each person has one role. A role is a grid: one row per feature, with View, Add, Edit and
Delete boxes. Add, Edit and Delete include View.

- **Admin** can do everything, including features added later. Its grid can't be changed.
- **Member** is the default for new people and starts with nothing ticked.
- Only Admins move people into or out of Admin, and only Admins reactivate people. Nobody
  changes their own role or deactivates themselves, and at least one active Admin always
  remains.
- Every change is recorded in **Settings → History**.

**Create a role like "Cashier":** sign in as an Admin, open **Settings → Roles → New role**,
name it, tick the boxes (e.g. Users: View, Invites: Add), and save. Then on **Users**, pick
"Cashier" in a person's Role column, or choose it when inviting someone. The change applies on
their next request; no sign-out needed.

**Deactivate** (Users: Delete) signs the person out and blocks sign-in until an Admin
reactivates them.

### Protect a new feature

1. Declare the feature's area next to its module, e.g. `apps/api/src/orders/orders.access.ts`:

   ```ts
   export const ordersArea = defineArea({
     key: 'orders',
     name: 'Orders',
     actions: { view: 'See every order', delete: 'Cancel any order' }, // leave out unused actions
   })
   ```

2. Add it to the list in `apps/api/src/access/areas.ts`. It now shows as a row in every role's
   grid, unticked for everyone except Admin.
3. Mark each operation: `@RequirePermission('orders', 'view')`. A caller without it gets
   `FORBIDDEN` with "You don't have access to view orders."
4. On the web, hide what people can't use with `can(access, 'orders', 'view')` (`access` comes
   from the `_protected` route context), and add page rules to `ROUTE_PERMISSIONS` in
   `apps/web/src/lib/guards.ts`. This is only convenience; the API is what enforces it.

## Password resets

There's no email. When someone is locked out, an Admin opens **Users** and chooses **Reset
password** on that person. The app shows a link once, valid for 24 hours, for the Admin to send
however they like.

- The link works once. Using it signs the person out everywhere.
- A new link replaces the old one, and the person's row shows "Reset link pending until …" with
  **Cancel**.
- Only the Admin role can create links (it isn't a grid box). Nobody creates one for themselves,
  and deactivated people get none. Deactivating someone cancels their pending link.
- Signed-in people change their own password in **Settings → Account** with their current
  password. They stay signed in on that device and are signed out on the others.
- Links, cancellations, resets and password changes are recorded in **Settings → History**. Only
  a fingerprint of each link is stored.

Better Auth still hashes passwords and keeps sessions: the app calls it through
`apps/api/src/auth/auth-passwords.ts`. Its own password endpoints (`/change-password`,
`/request-password-reset`, `/reset-password`, `/admin/set-user-password`) are blocked over
HTTP, so every change goes through these rules. If you turn on Better Auth's `cookieCache`, a
signed-out device keeps working until its cached cookie expires (`maxAge`).

The lifetime is `PASSWORD_RESET_TTL_MS` in `apps/api/src/password-reset/password-reset.service.ts`.

## Environment variables

`.env.example` lists them all. Locally they go in `.env`
([step 4](#run-it-on-your-machine)); in production set them through your host's environment or
secrets settings. Never commit them.

| Variable                                    | Used by | Meaning                                                                             |
| ------------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | API     | Postgres connection string                                                          |
| `BETTER_AUTH_SECRET`                        | API     | Session signing secret (`openssl rand -hex 32`)                                     |
| `BETTER_AUTH_URL`                           | API     | Public URL of the API                                                               |
| `WEB_ORIGINS`                               | API     | Web app URL(s) allowed to call the API, comma-separated                             |
| `COOKIE_DOMAIN`                             | API     | Empty: web and API share one origin (nginx proxies `/graphql`, `/api/`)             |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | API     | Optional Google sign-in; set both or neither                                        |
| `PORT`, `NODE_ENV`                          | API     | `3001`; `development` locally, `production` when deployed                           |
| `RATE_LIMIT_SIGN_IN_MAX` / `_WINDOW`        | API     | Sign-in attempts per window per address (`5` / `60` s)                              |
| `RATE_LIMIT_LINKS_MAX` / `_WINDOW`          | API     | Invite, reset-link and setup attempts (`10` / `60` s)                               |
| `RATE_LIMIT_GENERAL_MAX` / `_WINDOW`        | API     | All other requests per caller (`300` / `60` s)                                      |
| `CLIENT_IP_HEADERS`                         | API     | Headers holding the caller's address, in order (`cf-connecting-ip,x-forwarded-for`) |
| `VITE_API_URL`                              | Web     | API URL, baked in at build time                                                     |
| `VITE_ENABLE_GOOGLE_AUTH`                   | Web     | `true` shows the Google button                                                      |

## Deployment

The app is two Docker images, so it runs anywhere containers do: Coolify, Dokku, Fly.io,
Render, Railway, a VPS with Docker Compose, Kubernetes. Each push to `main` runs CI, which
builds both images. Build them from the repository root:

```sh
docker build -f apps/api/Dockerfile -t his-project-planner-api .
docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://app.example.com \
  -t his-project-planner-web .
```

| Image | Listens on | Health check | Notes                                                                                      |
| ----- | ---------- | ------------ | ------------------------------------------------------------------------------------------ |
| API   | `3001`     | `/health`    | Set the API [env vars](#environment-variables) at runtime. Migrations run on start.        |
| Web   | `80`       | `/health`    | Static nginx. `VITE_API_URL` is baked in at **build** time: rebuild to point at a new API. |

What the host needs to provide:

- **Postgres 16** reachable from the API through `DATABASE_URL`.
- **HTTPS in front of both containers** (a reverse proxy or the platform's router). The API
  trusts one proxy hop for the caller's address. If a CDN such as Cloudflare sits in front of the
  proxy, keep `cf-connecting-ip` first in `CLIENT_IP_HEADERS`; otherwise set it to
  `x-forwarded-for`.
- **One domain for both containers.** The web container's nginx proxies `/graphql` and `/api/`
  to the api container (service name `api`, port 3001), so set `VITE_API_URL`,
  `BETTER_AUTH_URL` and `WEB_ORIGINS` all to `https://app.example.com` and leave
  `COOKIE_DOMAIN` empty. Run both containers in one compose stack so `api` resolves.

After the first deploy, create the admin with the setup token from the API container's logs (see
[Run it on your machine](#run-it-on-your-machine), step 6).

