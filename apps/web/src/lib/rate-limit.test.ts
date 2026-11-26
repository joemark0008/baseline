import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { rateLimitMessage, retryAfterFromError, retryAfterFromResponse } from './rate-limit'

function gqlError(extensions: Record<string, unknown>) {
  return new CombinedGraphQLErrors({ errors: [{ message: 'x', extensions }] })
}

describe('retryAfterFromError', () => {
  it('reads retryAfter from a TOO_MANY_REQUESTS error', () => {
    expect(retryAfterFromError(gqlError({ code: 'TOO_MANY_REQUESTS', retryAfter: 42 }))).toBe(42)
  })

  it('falls back to a minute when the seconds are missing', () => {
    expect(retryAfterFromError(gqlError({ code: 'TOO_MANY_REQUESTS' }))).toBe(60)
  })

  it('returns null for anything else', () => {
    expect(retryAfterFromError(gqlError({ code: 'FORBIDDEN' }))).toBeNull()
    expect(retryAfterFromError(new Error('network'))).toBeNull()
    expect(retryAfterFromError(undefined)).toBeNull()
  })
})

describe('retryAfterFromResponse', () => {
  it('parses X-Retry-After and falls back otherwise', () => {
    expect(
      retryAfterFromResponse(new Response(null, { headers: { 'X-Retry-After': '17' } }), 60),
    ).toBe(17)
    expect(retryAfterFromResponse(new Response(null), 60)).toBe(60)
    expect(
      retryAfterFromResponse(new Response(null, { headers: { 'X-Retry-After': '0' } }), 60),
    ).toBe(60)
  })
})

describe('rateLimitMessage', () => {
  it('names the wait', () => {
    expect(rateLimitMessage(42)).toBe('Too many attempts. Try again in 42 seconds.')
    expect(rateLimitMessage(1)).toBe('Too many attempts. Try again in 1 second.')
  })
})
