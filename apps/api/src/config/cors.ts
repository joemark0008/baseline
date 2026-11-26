import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js'
import type { AppEnv } from './env.js'

/** Browser access for the web origins. `X-Retry-After` is the sign-in system's wait (feature 003). */
export function corsOptions(env: Pick<AppEnv, 'webOrigins'>): CorsOptions {
  return { origin: env.webOrigins, credentials: true, exposedHeaders: ['X-Retry-After'] }
}
