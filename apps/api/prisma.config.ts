import { existsSync } from 'node:fs'
import { defineConfig } from 'prisma/config'

// Local dev: Prisma 7 no longer auto-loads .env, so read the repo-root one if present.
const dotenv = new URL('../../.env', import.meta.url)
if (existsSync(dotenv)) process.loadEnvFile(dotenv)

/**
 * DATABASE_URL is only required by commands that touch a database (migrate, studio).
 * `prisma generate` runs on install and in Docker builds without one.
 */
const url = process.env.DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(url ? { datasource: { url } } : {}),
})
