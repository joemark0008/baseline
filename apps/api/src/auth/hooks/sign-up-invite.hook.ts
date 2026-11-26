import { Injectable } from '@nestjs/common'
import { APIError } from 'better-auth/api'
import { BeforeHook, Hook, type AuthHookContext } from '@thallesp/nestjs-better-auth'
import { InvitesService } from '../../invites/invites.service.js'

/** Invitation-only sign-up: reject /sign-up/email unless a pending invite exists for the email. */
@Hook()
@Injectable()
export class SignUpInviteHook {
  constructor(private readonly invitesService: InvitesService) {}

  @BeforeHook('/sign-up/email')
  async requireInvite(ctx: AuthHookContext): Promise<void> {
    const email = (ctx.body as { email?: string } | undefined)?.email
    if (!email || !(await this.invitesService.hasPendingInvite(email))) {
      throw new APIError('FORBIDDEN', { message: 'Sign-up is by invitation only.' })
    }
  }
}
