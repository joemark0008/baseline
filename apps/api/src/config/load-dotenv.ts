import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Local dev only: load the repo-root `.env` into process.env (existing vars win).
 * Import first in every entrypoint. In a deployed container there is no `.env`, so this is a no-op.
 * Resolves from this file, so it works from both `src/config` and `dist/config`.
 */
const path = fileURLToPath(new URL('../../../../.env', import.meta.url))
if (existsSync(path)) process.loadEnvFile(path)
