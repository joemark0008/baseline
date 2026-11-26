import { Field, ObjectType } from '@nestjs/graphql'
import { Invite } from '../entities/invite.entity.js'

@ObjectType()
export class InviteUserResult {
  @Field(() => Invite) invite: Invite
  @Field({ description: 'One-time link to hand to the invitee. The token is not stored.' })
  inviteUrl: string
}
