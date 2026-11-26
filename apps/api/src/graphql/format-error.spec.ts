import { formatGraphqlError } from './format-error.js'

describe('formatGraphqlError', () => {
  it('keeps message, path and code, drops everything else', () => {
    const out = formatGraphqlError({
      message: 'Bad Request Exception',
      path: ['inviteUser'],
      extensions: {
        code: 'BAD_REQUEST',
        stacktrace: ['x'],
        originalError: { message: ['email must be an email'], statusCode: 400 },
      },
    })
    expect(out).toEqual({
      message: 'email must be an email',
      path: ['inviteUser'],
      locations: undefined,
      extensions: { code: 'BAD_REQUEST' },
    })
  })

  it('derives a code from the HTTP status when Nest did not map one', () => {
    const out = formatGraphqlError({
      message: 'Invite already used',
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        originalError: { message: 'Invite already used', statusCode: 409 },
      },
    })
    expect(out.extensions).toEqual({ code: 'CONFLICT' })
  })

  it('defaults the code', () => {
    expect(formatGraphqlError({ message: 'boom' }).extensions).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
    })
  })

  it('maps 429 to TOO_MANY_REQUESTS and forwards retryAfter only', () => {
    const out = formatGraphqlError({
      message: 'Too many requests. Try again in 7 seconds.',
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        stacktrace: ['x'],
        originalError: {
          message: 'Too many requests. Try again in 7 seconds.',
          statusCode: 429,
          retryAfter: 7,
        },
      },
    })
    expect(out.extensions).toEqual({ code: 'TOO_MANY_REQUESTS', retryAfter: 7 })
    expect(out.message).toBe('Too many requests. Try again in 7 seconds.')
  })

  it('ignores a non-numeric retryAfter', () => {
    const out = formatGraphqlError({
      message: 'x',
      extensions: { originalError: { statusCode: 429, retryAfter: 'soon' } },
    })
    expect(out.extensions).toEqual({ code: 'TOO_MANY_REQUESTS' })
  })
})
