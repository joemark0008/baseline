import { Field, ObjectType } from '@nestjs/graphql'

/** Returned once, when an Admin creates the link. The link is never shown again. */
@ObjectType()
export class PasswordResetLink {
  @Field({ description: 'Give this to the person; it works once.' }) url: string
  @Field() expiresAt: Date
}
