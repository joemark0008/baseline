import type { GraphQLFormattedError } from 'graphql'

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'BAD_USER_INPUT',
  429: 'TOO_MANY_REQUESTS',
}

/** Clients get the message and a code, never stack traces or internal exception payloads. */
export function formatGraphqlError(formatted: GraphQLFormattedError): GraphQLFormattedError {
  const extensions = formatted.extensions ?? {}
  const original = extensions.originalError as
    { message?: string | string[]; statusCode?: number; retryAfter?: unknown } | undefined
  const message = Array.isArray(original?.message) ? original.message.join('; ') : formatted.message
  const code =
    (typeof extensions.code === 'string' &&
      extensions.code !== 'INTERNAL_SERVER_ERROR' &&
      extensions.code) ||
    (original?.statusCode && CODE_BY_STATUS[original.statusCode]) ||
    'INTERNAL_SERVER_ERROR'
  // `retryAfter` (seconds) is the one extra extension clients may read (feature 003).
  const retryAfter = typeof original?.retryAfter === 'number' ? original.retryAfter : undefined
  return {
    message,
    path: formatted.path,
    locations: formatted.locations,
    extensions: retryAfter === undefined ? { code } : { code, retryAfter },
  }
}
