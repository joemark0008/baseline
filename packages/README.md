# packages/

Shared workspace packages (e.g. a `@his-project-planner/shared` for types used by both apps).
Add one as `packages/<name>/package.json` with `"name": "@his-project-planner/<name>"`; the root
`workspaces` glob picks it up.
