import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth'
import { RequirePermission } from '../access/require-permission.decorator.js'

import type { AuthSession } from '../../auth/auth.config.js'
import { toSessionIdentity } from '../../auth/session-identity.js'
import { PageArgs } from '../../common/pagination/page-args.js'
import { AcceptInviteResult } from './dto/accept-invite.output.js'
import { InviteUserInput } from './dto/invite-user.input.js'
import { InviteUserResult } from './dto/invite-user.output.js'
import { InviteValidation } from './dto/invite-validation.output.js'
import { InvitesPage } from './dto/invites-page.output.js'
import { Invite } from './entities/invite.entity.js'
import { InvitesService } from './invites.service.js'
import { OneTimeLinkOperation } from '../../rate-limit/rate-limit.decorators.js'

export { buildInviteUrl } from './links.js'

@Resolver(() => Invite)
export class InvitesResolver {
  constructor(private readonly invitesService: InvitesService) {}

  @Mutation(() => InviteUserResult, { description: 'Invite a person by email. Needs invites:add.' })
  @RequirePermission('invites', 'add')
  async inviteUser(
    @Args('input') input: InviteUserInput,
    @Session() session: AuthSession,
  ): Promise<InviteUserResult> {
    const { invite, inviteUrl, emailSent } = await this.invitesService.inviteUser({
      email: input.email,
      roleId: input.roleId ?? null,
      legacyRole: input.role ?? null,
      invitedById: toSessionIdentity(session).userId,
    })
    return { invite, inviteUrl, emailSent }
  }

  @Query(() => InvitesPage, { description: 'Pending invites, newest first. Needs invites:view.' })
  @RequirePermission('invites', 'view')
  pendingInvites(@Args() pageArgs: PageArgs): Promise<InvitesPage> {
    return this.invitesService.pendingInvites(pageArgs)
  }

  @Mutation(() => Boolean, { description: 'Revoke a pending invite. Needs invites:delete.' })
  @RequirePermission('invites', 'delete')
  revokeInvite(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.invitesService.revokeInvite(id)
  }

  @Query(() => InviteValidation, { description: 'Public: check an invite token before sign-up.' })
  @AllowAnonymous()
  @OneTimeLinkOperation()
  validateInviteToken(@Args('token') token: string): Promise<InviteValidation> {
    return this.invitesService.validateToken(token)
  }

  @Mutation(() => AcceptInviteResult, {
    description: 'Burn the invite token for the signed-in user and apply its role.',
  })
  acceptInvite(
    @Args('token') token: string,
    @Session() session: AuthSession,
  ): Promise<AcceptInviteResult> {
    const { userId, email } = toSessionIdentity(session)
    return this.invitesService.accept(token, { userId, email })
  }
}
