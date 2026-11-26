# packages/

Shared workspace packages (e.g. a `@baseline/shared` for types used by both apps).
Add one as `packages/<name>/package.json` with `"name": "@baseline/<name>"`; the root
`workspaces` glob picks it up.
