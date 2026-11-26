import { BadRequestException } from '@nestjs/common'

/** Shared by Better Auth, the setup wizard and password resets so all enforce the same rule. */
export const MIN_PASSWORD_LENGTH = 8
/** Better Auth's default maximum. */
export const MAX_PASSWORD_LENGTH = 128

export function assertPasswordPolicy(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new BadRequestException(
      `Password must be ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters`,
    )
  }
}
