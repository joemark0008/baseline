import { CombinedGraphQLErrors } from '@apollo/client/errors'

export const TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS'
const DEFAULT_WAIT_SECONDS = 60

/** Seconds to wait when `error` is a rate-limit refusal from the API, else null. */
export function retryAfterFromError(error: unknown): number | null {
  if (!CombinedGraphQLErrors.is(error)) return null
  for (const e of error.errors) {
    if (e.extensions?.code !== TOO_MANY_REQUESTS) continue
    const n = Number(e.extensions.retryAfter)
    return Number.isFinite(n) && n > 0 ? Math.ceil(n) : DEFAULT_WAIT_SECONDS
  }
  return null
}

/** Seconds from the sign-in system's `X-Retry-After` header (exposed through CORS). */
export function retryAfterFromResponse(response: Response, fallbackSeconds: number): number {
  const raw = response.headers.get('x-retry-after') ?? response.headers.get('retry-after')
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : fallbackSeconds
}

export function rateLimitMessage(seconds: number): string {
  const unit = seconds === 1 ? 'second' : 'seconds'
  return `Too many attempts. Try again in ${seconds} ${unit}.`
}
