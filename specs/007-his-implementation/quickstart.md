# Quickstart: HIS Implementation Preview

## Prerequisites

- Node.js 22 and npm (or the repository's supported Node 22 container).
- Dependencies installed from the repository root.

## Run the web app

```sh
npm ci
npm run dev:web
```

Open `http://localhost:4173/preview`. The preview uses fictional fixture data and does not require API, database, authentication, or setup-token configuration.

## Verify

```sh
npm test -w apps/web -- --run
npm run typecheck -w apps/web
npm run build -w apps/web
```

Expected: the preview route renders the implementation summary, all nine lifecycle phases, timeline, task list, readiness items, team, and activity; preview interactions switch views/filter local sample data; existing login/setup routes remain unchanged.

## Coolify visual review

The project is deployed through Coolify according to `/root/project/CLAUDE.md` as the custom
service `his-project-planner` (see `plan.md`, Deployment Notes). The visual review URL is
`https://his-project-planner.joemarkgimeno.com/preview`. Check it with:

```sh
curl -sI https://his-project-planner.joemarkgimeno.com/preview | head -1
```

Expected: `HTTP/2 200`. The preview needs no database or sign-in; after changing the preview,
rebuild the web image and redeploy the service before re-checking.
