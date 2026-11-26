import { Inject } from '@nestjs/common'
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth'
import type { AuthSession } from '../../auth/auth.config.js'
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../../auth/password.js'
import { APP_ENV, type AppEnv } from '../../config/env.js'
import { ChangePasswordInput } from './dto/change-password.input.js'
import { ResetPasswordInput } from './dto/reset-password.input.js'
import { PasswordPolicy } from './entities/password-policy.entity.js'
import { PasswordResetLink } from './entities/password-reset-link.entity.js'
import { PasswordResetTokenStatus } from './entities/password-reset-token-status.entity.js'
import { PasswordResetService } from './password-reset.service.js'
import { PasswordService } from './password.service.js'
import { OneTimeLinkOperation } from '../../rate-limit/rate-limit.decorators.js'

export function buildResetUrl(webOrigin: string, token: string): string {
  const url = new URL('/reset-password', webOrigin)
  url.searchParams.set('token', token)
  return url.toString()
}

@Resolver()
export class PasswordResetResolver {
  constructor(
    private readonly resets: PasswordResetService,
    private readonly own: PasswordService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  // Public: the sign-in-free reset page shows the rules before the visitor types.
  @Query(() => PasswordPolicy, { description: 'The password rules. Public.' })
  @AllowAnonymous()
  passwordPolicy(): PasswordPolicy {
    return { minLength: MIN_PASSWORD_LENGTH, maxLength: MAX_PASSWORD_LENGTH }
  }

  @Mutation(() => PasswordResetLink, {
    description: 'Create a one-time, 24-hour link for another person. Admin role only.',
  })
  async createPasswordResetLink(
    @Args('userId', { type: () => ID }) userId: string,
    @Session() session: AuthSession,
  ): Promise<PasswordResetLink> {
    const { token, expiresAt } = await this.resets.create(session.user.id, userId)
    return { url: buildResetUrl(this.env.webOrigins[0], token), expiresAt }
  }

  // Public: the visitor has no session; the token is the credential.
  @Query(() => PasswordResetTokenStatus, { description: 'Check a reset link. Public.' })
  @AllowAnonymous()
  @OneTimeLinkOperation()
  validatePasswordResetToken(@Args('token') token: string): Promise<PasswordResetTokenStatus> {
    return this.resets.validate(token)
  }

  // Public: the visitor has no session; the token is the credential.
  @Mutation(() => Boolean, { description: 'Set a new password with a reset link. Public.' })
  @AllowAnonymous()
  @OneTimeLinkOperation()
  resetPassword(@Args('input') input: ResetPasswordInput): Promise<boolean> {
    return this.resets.reset(input.token, input.newPassword)
  }

  @Mutation(() => Boolean, {
    description: "Cancel a person's pending reset link. Admin role only.",
  })
  cancelPasswordResetLink(
    @Args('userId', { type: () => ID }) userId: string,
    @Session() session: AuthSession,
  ): Promise<boolean> {
    return this.resets.cancel(session.user.id, userId)
  }

  @Mutation(() => Boolean, {
    description: 'Change your own password. Signs you out everywhere except here.',
  })
  changePassword(
    @Args('input') input: ChangePasswordInput,
    @Session() session: AuthSession,
  ): Promise<boolean> {
    return this.own.change(
      session.user.id,
      session.session.token,
      input.currentPassword,
      input.newPassword,
    )
  }
}
