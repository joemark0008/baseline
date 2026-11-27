# Contract: GraphQL additions (feature 011)

Additive only. Generated into `apps/api/schema.graphql`; consumed through `graphql()` documents
in `apps/web/src/feature/projects/operations.ts`.

## Types

```graphql
extend type ProjectTask {
  "When the status last became COMPLETE; null while not complete (feature 011)."
  completedAt: DateTime
}
```

No new queries, mutations, inputs or arguments. Search, "mine", hide-done, folding and lanes are
client-side over the tasks the `project` query already returns.

## Behavioural rules behind existing mutations

| Mutation                   | Rule                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `updateProjectTask(input)` | `status` → `COMPLETE` sets `completedAt = now()`; `COMPLETE` → other clears it; same status leaves it alone. |
| `moveProjectTask(input)`   | Same rule when the move changes status; a no-op move still writes nothing.                                   |
| `createProjectTask(input)` | `status: COMPLETE` on creation sets `completedAt = now()`; otherwise null.                                   |

## Web documents

- `PROJECT` and `PROJECT_TASK` select `completedAt` on tasks (run `npm run codegen -w apps/web`).
- No other document changes.

## Errors

None new.
