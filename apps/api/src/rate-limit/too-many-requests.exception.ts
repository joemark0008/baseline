import { HttpException, HttpStatus } from '@nestjs/common'

export function tooManyRequestsMessage(retryAfter: number): string {
  return `Too many requests. Try again in ${retryAfter} seconds.`
}

/** HTTP 429 carrying the whole seconds to wait; `formatGraphqlError` forwards `retryAfter`. */
export class TooManyRequestsException extends HttpException {
  readonly retryAfter: number

  constructor(retryAfterSeconds: number) {
    const retryAfter = Math.max(1, Math.ceil(retryAfterSeconds))
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: tooManyRequestsMessage(retryAfter),
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    )
    this.retryAfter = retryAfter
  }
}
