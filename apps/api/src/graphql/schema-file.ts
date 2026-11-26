import { join } from 'node:path'

/** The committed schema, written at boot (dev) and by `npm run schema:generate` (CI/offline). */
export const SCHEMA_FILE = join(import.meta.dirname, '..', '..', 'schema.graphql')
