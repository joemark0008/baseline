# baseline Constitution

## Core Principles

### I. Single Responsibility (SRP)

Every module, class, and function MUST have exactly one reason to change, and that reason MUST be
stated in its name or a one-line doc comment.

- A unit that mixes concerns (e.g. GraphQL resolving with business rules, or persistence with
  validation) MUST be split before it is merged.
- A function longer than roughly 40 lines or a class with more than one cohesive group of methods
  is a review flag; the author MUST either split it or justify it in the PR description.
- Feature work MUST be organised so that a change to one business rule touches one module.

Rationale: a unit with a single responsibility is easier to name, test in isolation, and replace.
Mixed concerns are the main source of accidental coupling and regression.

### II. Open/Closed (OCP)

Behaviour MUST be extended by adding new code (new implementations, strategies, handlers, or
plugins), not by editing stable, already-tested code paths.

- Variation points that are expected to grow (payment methods, exporters, validators, notification
  channels, etc.) MUST be modelled behind an abstraction with one implementation per variant.
- Adding a variant MUST NOT require modifying existing variants or a central `switch`/`if` chain;
  if such a chain exists, the change MUST replace it with polymorphism or a registry.
- Editing stable code is permitted only to fix a defect or to introduce the extension point
  itself, and that edit MUST be covered by existing or new tests.

Rationale: code that is closed to modification keeps its tests valid and lets new behaviour ship
without re-verifying everything that already works.

### III. Liskov Substitution (LSP)

Any implementation of an interface or subclass of a base type MUST be usable wherever the
abstraction is expected, without the caller needing to know the concrete type.

- Subtypes MUST NOT strengthen preconditions, weaken postconditions, or throw exceptions the
  abstraction does not declare.
- Subtypes MUST NOT override a method with an empty body or a "not supported" error; if a method
  does not apply, the abstraction is wrong and MUST be split (see Principle IV).
- Every abstraction with more than one implementation MUST have a shared contract test suite that
  all implementations pass.
- Callers MUST NOT branch on concrete type (`instanceof`, type tags) to work around a subtype's
  behaviour.

Rationale: substitutability is what makes abstractions trustworthy. A subtype that breaks the
contract silently moves bugs to every call site.

### IV. Interface Segregation (ISP)

Interfaces MUST be small and client-specific. No consumer MUST be forced to depend on methods it
does not use.

- Define interfaces from the consumer's point of view (what the caller needs), not from the
  provider's (everything the implementation can do).
- An interface with more than roughly five methods, or whose implementations leave methods
  unimplemented, MUST be split into role interfaces.
- Function and constructor parameters MUST accept the narrowest abstraction that satisfies the
  need (e.g. one injected service, not a bag of unrelated collaborators).
- React components MUST accept only the props they render or act on; pass narrow data and
  callbacks rather than whole entities or stores.

Rationale: narrow interfaces reduce coupling, make fakes trivial to write for tests, and keep a
change to one capability from rippling to unrelated consumers.

### V. Dependency Inversion (DIP)

High-level policy MUST NOT depend on low-level detail. Both MUST depend on abstractions owned by
the high-level side.

- Business logic lives in NestJS `@Injectable()` services (`<feature>.service.ts`). Services
  MUST NOT import HTTP clients or the auth library and MUST NOT read HTTP requests, cookies or
  sessions. Reading the clock (`new Date()`) and `node:crypto` directly is permitted; tests
  control time with Vitest fake timers.
- Persistence follows the NestJS Prisma recipe: services inject the global `PrismaService` and
  use `prisma.client`. The raw Prisma client (`src/generated/prisma`, any `@prisma/*` package,
  `src/prisma/prisma.client.ts`) is imported only by `src/prisma/`, the Better Auth adapter in
  `src/auth/`, and `src/setup-token.ts`. A repository abstraction is introduced only under the
  simplicity rule (a real second implementation), not by default.
- Dependencies MUST be supplied through constructors and wired by the NestJS module system.
  Global singletons, service locators, and hidden `new` of collaborators inside services are
  prohibited.
- Features talk to each other through exported services: a module exports its service, and a
  consumer imports that module and injects the service. A feature MUST NOT write another
  feature's tables directly when that feature's service offers the operation.
- GraphQL resolvers (and REST controllers) MUST only translate arguments into service calls and
  map results to GraphQL types; they MUST contain no business rules.
- On the frontend, data access MUST go through a typed API client layer (generated GraphQL
  operations plus hooks); route components and UI components MUST NOT call the transport directly.
- Authentication is an infrastructure concern. Services MUST receive the current principal
  (user id, email, role) as a plain value from the resolver; they MUST NOT import `better-auth`.
- Every service MUST be unit-testable with `Test.createTestingModule`, replacing `PrismaService`
  and other providers with `useValue` fakes, and no I/O.

Rationale: inverting dependencies keeps the core of the system independent of tools that change
often, and is what makes Principles I–IV enforceable in tests.

## Technology Stack

The stack below is fixed for this project. Substituting a listed technology is a constitution
amendment (MINOR at least), not a per-feature decision.

### Pinned majors

Upgrading past a listed major is a stack change and needs an amendment; minor and patch updates
(Renovate) do not.

- **Shared**: Node.js 22 (`node:22-alpine` images), npm workspaces, TypeScript 6, ESLint 10,
  Prettier 3, Vitest 5, GraphQL 16.
- **API**: NestJS 12, `@nestjs/graphql`/`@nestjs/apollo` 14, Apollo Server 5, Prisma 7,
  Better Auth 1.x, `@thallesp/nestjs-better-auth` 2.x, PostgreSQL 16.
- **Web**: React 19, Vite 8, TanStack Router 1.x, Apollo Client 4, Tailwind CSS 4,
  GraphQL Code Generator CLI 8 (`client-preset` 7); served by `nginx:1.27-alpine`.

### Backend

- **Runtime and framework**: Node.js 22 (LTS) with NestJS 12 on the Express adapter (TypeScript
  6.0.x, strict mode). Features are NestJS modules; cross-cutting concerns use NestJS guards,
  interceptors, pipes, and filters rather than ad-hoc middleware. NestJS 12 ships as ES modules,
  so the API compiles with `module: nodenext` (`"type": "module"`, relative imports carry `.js`).
  Unit and integration tests run on Vitest with the SWC plugin (decorator metadata).
- **Scaffolding**: modules, services, resolvers and controllers are generated with the Nest CLI
  schematics (`nest g <schematic> <name>` in `apps/api`, or `npm run g -w apps/api -- …`) and
  then filled in;
  generated `*.spec.ts` files are kept and completed, not deleted. `nest-cli.json` keeps
  `generateOptions.spec: true`.
- **API**: GraphQL via `@nestjs/graphql` 14 with the Apollo driver (Apollo Server 5), code-first.
  The schema is generated from decorated TypeScript classes by `npm run schema:generate` and
  committed as `apps/api/schema.graphql` so frontend codegen has a stable, offline source; CI
  fails when the committed file drifts. REST endpoints are permitted only for webhooks, health
  checks, Better Auth's own `/api/auth/*` routes, and file upload/download.
- **Pagination**: every list query takes the shared `PageArgs` (`page` default 1, `perPage`
  default 10, max 200, validated with `class-validator`) and returns
  `class <Feature>Page extends Paginated(<Entity>)`, i.e. `{ data, meta: PageMeta }` where
  `PageMeta` carries `total`, `lastPage`, `currentPage`, `perPage`, `prev`, `next`, `hasNextPage`
  and `hasPrevPage`. Services compute it with `toPageQuery()` and `buildPageMeta()` from
  `src/common/pagination/`; hand-rolled page shapes are prohibited.
- **ORM**: Prisma 7 with the `prisma-client` generator and the `@prisma/adapter-pg` driver
  adapter; connection settings live in `apps/api/prisma.config.ts`, never in the schema.
  The schema folder `apps/api/prisma/schema/` is the single source of truth for the data model:
  `schema.prisma` holds only the generator and datasource, and each feature's models live in
  `<feature>.prisma` (e.g. `invites.prisma`, `access.prisma`); Better Auth's models live in
  `auth.prisma`. A model belongs to the feature that owns it. All schema changes ship as
  committed Prisma migrations; `prisma db push` is prohibited outside local throwaway databases.
  The generated client (`src/generated/prisma`) is not committed; it is produced on install.
- **Database**: PostgreSQL 16, with one database and one `LOGIN NOSUPERUSER` role per project
  (on a shared instance or a dedicated one); `DATABASE_URL` is supplied by the deployment
  environment.
  The project role MAY be granted `CREATEDB` solely so `prisma migrate dev` can create its shadow
  database.
- **Validation**: input validation at the GraphQL boundary via `class-validator` on input types
  (or an equivalent schema validator); business invariants are enforced again inside services.

### Authentication

- **Library**: Better Auth (`better-auth`), integrated into NestJS through the community package
  `@thallesp/nestjs-better-auth`, which is the integration the official Better Auth docs point
  NestJS users to. No other auth library (Passport, custom JWT middleware, Auth0 SDK) is used for
  first-party sessions.
- **Wiring**: a single `betterAuth(...)` instance is defined in `apps/api/src/auth/auth.config.ts`
  and registered once via `AuthModule.forRoot({ auth })` in the root module. The app is created
  with `NestFactory.create(AppModule, { bodyParser: false })` as the integration requires; the
  Express adapter is used (Fastify support is beta and is not permitted).
- **Persistence**: Better Auth uses its Prisma adapter against the project's PostgreSQL database.
  Its tables (`user`, `session`, `account`, `verification`, plus plugin tables) are generated with
  `npx @better-auth/cli generate --output <scratch file>`, copied into `prisma/schema/auth.prisma`,
  and migrated with ordinary Prisma
  migrations. Hand-editing those models is prohibited; regenerate instead. The one exception is
  a relation (back-reference) field pointing at a project model, which adds no column and which
  Prisma requires on both sides of a relation.
- **Authorization**: the integration's `AuthGuard` stays registered globally. Every REST route and
  GraphQL resolver is authenticated by default; public operations MUST opt out explicitly with
  `@AllowAnonymous()` (or `@OptionalAuth()` where a session is optional). The session is read in
  resolvers via the `@Session()` decorator or the injected `AuthService`, then passed to services
  as a value (see Principle V). Authorization is permission-based: every protected operation
  carries `@RequirePermission(area, action)` (`src/access/`), where `action` is `view`, `add`,
  `edit` or `delete` and `area` is declared by the owning feature in `<feature>.access.ts` and
  registered in `src/access/areas.ts`. The guard reads the person's role from the database on
  every request. `@Roles()` is not used. Business-level rules beyond these permissions (record
  ownership, state checks) live in services.
- **Logic stays on the server**: the web app makes no authorization or business decisions. When
  a screen needs to know whether the caller may do something to a record, the API exposes it as a
  server-computed field (e.g. `User.can`, `Role.can`), and lists arrive already filtered and
  ordered. The web may hide controls using these fields and the `myAccess` permission list, but
  it never re-derives the rules; the services enforce every rule again on each change.
- **Lifecycle hooks**: sign-up/sign-in side effects (welcome email, audit log, default records)
  use the integration's `@Hook()`/`@BeforeHook()`/`@AfterHook()` providers, not ad-hoc code in
  resolvers.
- **Frontend**: the web app uses the `better-auth/react` client (`createAuthClient`) with the API
  origin as `baseURL`. Session state comes from the client's `useSession` hook; route protection
  is done in TanStack Router `beforeLoad` using that session, not inside components.
- **Transport and secrets**: sessions are cookie-based; the API and web app are served from
  subdomains of one parent domain (e.g. `api.example.com` and `app.example.com`), and
  `COOKIE_DOMAIN` scopes the session cookie to it. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
  OAuth provider credentials are set in the host's environment or secret store; they never
  appear in the repo. Local-development values live only in the
  git-ignored root `.env` (see Local Development).

- **Access model**: sign-up is invitation-only. An admin issues an invite (email + role) through
  the `invites` feature module; the invite link carries a one-time token; sign-up on
  `/sign-up/email` is rejected by a `@BeforeHook` unless a pending invite exists for that email;
  the web app then calls `acceptInvite` to burn the token and apply the role. Each person has exactly one
  role; roles are created in Settings as grids of permissions, with two built-in roles, Admin
  (every permission, always) and Member. Better Auth's `user.role` is derived from the role
  (`admin` for Admin, otherwise `user`) and never edited directly; the
  `username` plugin allows email-or-username login. Google sign-in is registered only when both
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. The first admin is created once
  through the first-run setup wizard (`src/setup/`): while setup is open the API prints a
  one-time setup token in its log and stores only its SHA-256 hash; the anonymous
  `completeSetup` mutation exchanges that token for the admin account, created through Better
  Auth's `auth.api.createUser`, and closes setup permanently. Everyone else joins by invite. No
  admin credentials are ever kept in env vars, files or scripts.

### Frontend

- **Framework and build**: React 19 with Vite 8, TypeScript strict mode. Tests run on Vitest
  with React Testing Library and jsdom.
- **Routing**: TanStack Router with file-based routing. Routes live under `src/routes/` and are
  generated by the TanStack Router Vite plugin; hand-written route trees are prohibited.
  Loaders and search-param schemas are declared on the route, not inside components.
- **UI components**: shadcn/ui on top of Tailwind CSS 4 with `lucide-react` icons. shadcn
  components are copied into `src/components/ui/` and MAY be edited there; feature components
  compose them and MUST NOT re-implement primitives shadcn already provides. Theme tokens live in
  `src/styles/app.css` (CSS variables), not in component files. UI design conventions (page
  anatomy, data-view states, forms, feedback, the review checklist) live in the `ui-design` skill
  at `.claude/skills/ui-design/`; this constitution wins on any conflict.
- **Data layer**: Apollo Client 4 is the GraphQL client. Operations are authored in `.ts`/`.tsx`
  files with the `graphql()` tag generated by GraphQL Code Generator's `client` preset
  (`src/graphql/codegen/`, generated, never edited) from the committed `apps/api/schema.graphql`;
  plain `gql` from `@apollo/client` is prohibited. Hooks are called without generic parameters so
  result and variable types flow from the document. Components consume only generated types;
  hand-written response types are prohibited (derive row types with `DocumentType`).
  `ignoreNoDocuments` stays `false` so a malformed document fails codegen loudly.
- **State**: server state lives in the Apollo cache. Client-only state uses React state or a
  small store; no global store for server data.
- **Feature layout**: `src/feature/<domain>/` owns a page's components, hooks and colocated
  `operations.ts`; route files under `src/routes/` stay one line (`createFileRoute` pointing at
  the feature page). `src/routes/_protected.tsx` is the pathless auth guard (session and role
  checks in `beforeLoad`); public screens live under `src/routes/_public/`. Shared presentational
  components in `src/components/` MUST NOT import routes, features or the data layer. A single
  Better Auth client is exported from `src/lib/auth-client.ts`; client-side role checks are UX
  only, the API enforces authorization.

### Repository Layout

The project is an npm-workspaces monorepo with two deployable packages, `apps/api` (NestJS)
and `apps/web` (Vite/React), plus `packages/` for shared code. Each app has its own Dockerfile
and runs as its own container behind HTTPS on any container host (by default on the `<name>-api`
and `<name>` subdomains). The repository is a boilerplate: `scripts/init.sh <project-name>`
renames the placeholder `baseline` everywhere and, with `--provision`, creates the
database and role on the shared Postgres described in the root `CLAUDE.md`. Linting (ESLint 10 flat config) and formatting (Prettier) are configured
once at the root for both apps.

### Local Development

- **Runtime**: Node.js 22 MAY run on the host or inside a `node:22-alpine` container; both MUST
  behave the same.
- **Configuration**: the git-ignored repo-root `.env` is the single source of local
  configuration. It is loaded by `apps/api/src/config/load-dotenv.ts` (the first import in every
  API entrypoint: `main.ts`, `setup-token.ts`), by `apps/api/prisma.config.ts` (Prisma 7 does not load
  `.env` itself), and by Vite through `envDir: '../..'`. Loading is a no-op when the file is
  absent, and variables already set in the environment win, so Docker images and deployed
  containers are unaffected. `.env` MUST NOT be committed or copied into images; `.env.example`
  documents every variable with placeholder values only. No `dotenv` dependency is added; Node's
  built-in `process.loadEnvFile` is used.
- **Database**: local Postgres follows the same rule as production: one database and one
  `LOGIN NOSUPERUSER` role per project, with `CREATEDB` for the Prisma shadow database. The host
  in `DATABASE_URL` is `localhost` for host-run Node and `host.docker.internal` from a container.

## Code Quality Constraints

- **Tests are mandatory.** Every behaviour change ships with unit tests next to the code
  (`*.spec.ts`) built with `Test.createTestingModule` and `useValue` fakes (Principle V).
  Abstractions with multiple implementations ship with contract tests (Principle III). Backend
  end-to-end tests live in `apps/api/test/*.e2e-spec.ts` (`npm run test:e2e -w apps/api`), boot
  the real `AppModule` against Postgres (`DATABASE_URL`), and cover each feature's persistence.
  Frontend components with logic ship with React Testing Library tests; routes with loaders ship
  with loader tests.
- **Module layout is the Nest CLI standard, under `feature/`.** Each backend feature is one
  folder under `apps/api/src/feature/<feature>/` with plural, kebab-case names, laid out as
  `nest g` produces it (generate with `nest g <schematic> feature/<name>`):

  ```text
  feature/<feature>/
    <feature>.module.ts         providers, imports, exports (the service)
    <feature>.resolver.ts       GraphQL (or <feature>.controller.ts for REST)
    <feature>.service.ts        business rules; injects PrismaService
    <feature>.access.ts         the feature's permission area (when it has protected operations)
    <feature>.*.spec.ts         unit specs generated with each class
    dto/                        <action>.input.ts (@InputType/@ArgsType), <action>.output.ts
    entities/                   <name>.entity.ts (@ObjectType)
  test/
    app.e2e-spec.ts             end-to-end tests against the real AppModule
  ```

  Cross-cutting modules (`auth/`, `config/`, `graphql/`, `prisma/`, `health/`, `common/`,
  `rate-limit/`) stay directly under `apps/api/src/` and use the same naming; only domain
  features live under `feature/`, mirroring `apps/web/src/feature/<domain>/`. ESLint `no-restricted-imports` rules in `eslint.config.mjs` MUST fail the build on:
  - any import of the raw Prisma client (`@prisma/*`, `generated/prisma`, `prisma/prisma.client`)
    outside `src/prisma/`, `src/auth/` and `src/setup-token.ts`;
  - any `better-auth` or `@thallesp/nestjs-better-auth` import outside `auth/`, resolvers
    (`*.resolver.ts`), REST controllers (`*.controller.ts`) and the composition root
    (`app.module.ts`, `main.ts`);
  - on the frontend, any import of `routes/`, `feature/`, `graphql/` or the Apollo client
    (`lib/gql-client`) from `src/components/`.
- **Schema contracts are versioned.** `schema.graphql` and Prisma migrations are committed with
  the change that produces them; a PR whose generated schema differs from the committed one fails
  CI. Breaking GraphQL changes (removing or retyping a field) MUST go through a deprecation
  period using `@deprecated` before removal.
- **Static analysis is on.** ESLint, Prettier, and `tsc --noEmit` run in CI for both apps and
  MUST pass before merge. `any` is prohibited except with an inline justification comment.
- **Simplicity over speculation.** SOLID is applied where variation or substitution is real or
  clearly imminent. Do not introduce an abstraction with a single implementation; YAGNI
  governs. Any abstraction MUST be justified by at least one of: a second
  implementation, or an explicit extension point named in the spec; a test fake alone is not
  enough, because `Test.createTestingModule` can replace any provider.
- **Deployment is host-agnostic.** The two images MUST run on any container host given the
  documented env vars, a Postgres 16 database and HTTPS in front; no code or image may depend on
  a specific platform. When a project deploys to the infrastructure described in the repository
  root `CLAUDE.md` (Coolify, shared Postgres, subdomain routing, secrets handling), those rules
  apply unchanged and are not overridden by this document.

## Development Workflow & Review Gates

- **Spec-driven.** Every new feature MUST go through Spec Kit: `/speckit-specify` →
  `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` (`/speckit-clarify` and
  `/speckit-analyze` as needed). Its artifacts live in `specs/<NNN-feature>/` and nowhere else;
  no other planning workflow or design-doc folder is committed. Bug fixes, dependency bumps and
  docs-only changes MAY skip the flow. The plan MUST include a Constitution Check that names, per principle, how
  the design satisfies it or why a deviation is justified.
- **Design before code.** The plan MUST identify the Nest modules, services, resolvers and DTOs
  the feature introduces (and any abstraction, justified under the simplicity rule), the NestJS
  module wiring and cross-module service exports, the GraphQL schema additions,
  the Prisma migration, and the new route files.
- **Review checklist.** Every PR review MUST confirm:
  1. Each new unit has one stated responsibility (I).
  2. Adding the next variant would not require editing existing variants (II).
  3. New implementations pass the shared contract tests; no type-switching at call sites (III).
  4. New interfaces are consumer-sized; no unimplemented or stubbed methods (IV).
  5. Business rules live in services; features use `PrismaService`, never the raw client;
     dependencies are injected via NestJS modules; resolvers contain no business rules (V).
  6. Any abstraction added is justified under the simplicity rule.
  7. Stack compliance: committed migration and `schema.graphql` are up to date, generated GraphQL
     types are used on the frontend, routes are file-based, UI primitives come from shadcn, and
     every new resolver or route is either authenticated by the global guard or carries an
     explicit `@AllowAnonymous()`/`@OptionalAuth()` with a stated reason, and every protected
     operation carries `@RequirePermission(area, action)`, and the web reads capability fields
     instead of re-deriving rules.
- **Complexity justification.** A deviation from any principle MUST be recorded in the plan's
  Complexity Tracking table with the reason and the simpler alternative that was rejected.
- **Refactor on touch.** When a change touches code that violates a principle, the author SHOULD
  bring that code into compliance in the same or an immediately following PR, scoped so the
  behaviour change and the refactor are reviewable separately. This is a recommendation rather
  than a gate so that bug fixes are not blocked by unrelated cleanup.

## Governance

- This constitution supersedes all other coding conventions and practices in this project. Where
  a tool default, template, or habit conflicts with it, the constitution wins.
- **Amendments** require: (1) a written proposal describing the change and its rationale,
  (2) an updated version line and Sync Impact Report in this file, (3) a migration note for any
  existing code that becomes non-compliant, and (4) approval by the project maintainer.
- **Versioning** follows semantic versioning:
  - MAJOR: a principle is removed or redefined in a backward-incompatible way.
  - MINOR: a principle or section is added, or guidance is materially expanded (including a
    change to the Technology Stack).
  - PATCH: wording, clarification, or typo fixes with no semantic change.
- **Compliance review.** Every plan's Constitution Check and every PR review MUST verify the gates
  in "Development Workflow & Review Gates". Unresolved violations block merge unless recorded as a
  justified deviation.
- **Boilerplate and projects.** This constitution ships with the speckit boilerplate and is the
  starting rule set of every project created from it. Stack-wide changes (a new pinned major, a
  layout or testing convention) are amended in the boilerplate first and then adopted by existing
  projects deliberately. An amendment made inside a project applies to that project only and
  follows the same amendment and versioning rules.
- Runtime development guidance for agents lives in `CLAUDE.md` files; those files MUST stay
  consistent with this constitution and defer to it on conflict.

**Version**: 2.6.0 | **Ratified**: 2026-11-19 | **Last Amended**: 2026-11-21
