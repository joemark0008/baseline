# baseline

Read `.specify/memory/constitution.md` before writing code: it fixes the stack, the layer rules
and the review gates. The images run on any container host; when deploying to the Coolify server, the root
`../CLAUDE.md` fixes deployment (subdomains, shared Postgres).

- API: `apps/api` (NestJS 12, code-first GraphQL, Prisma 7, Better Auth). Every domain feature is
  one folder under `src/feature/<name>/` in the Nest CLI layout (`<feature>.module/resolver/service.ts`,
  `dto/`, `entities/`); cross-cutting modules (`auth`, `config`, `graphql`, `prisma`, `health`,
  `common`, `rate-limit`) stay directly under `src/`. Services inject `PrismaService`. Scaffold with
  `nest g` (`npm run g -w apps/api -- <schematic> feature/<name>`).
  E2E tests: `npm run test:e2e -w apps/api`.
- Web: `apps/web` (React 19, Vite 8, TanStack Router, shadcn/ui, Apollo 4). Operations use the
  generated `graphql()` tag; run `npm run codegen -w apps/web` after changing them. UI work
  follows the `ui-design` skill (`.claude/skills/ui-design/`); add shadcn components through the
  `shadcn` MCP server in `.mcp.json` (approve it once) or the pinned CLI it names; never
  hand-write imitations.
- After changing resolvers run `npm run schema:generate` and commit `apps/api/schema.graphql`.
- Node 22 may run on the host or inside `node:22-alpine`. Local config is the git-ignored root `.env`,
  loaded automatically by the API, `prisma.config.ts` and Vite (see README → Local development).
- New features go through Spec Kit (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`); artifacts live in `specs/`. Don't commit other planning docs.
- New clone? Run `/project-init <name>` first.
