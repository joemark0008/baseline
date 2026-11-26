import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class PasswordResetTokenStatus {
  @Field() valid: boolean
  @Field(() => String, { nullable: true, description: 'Whose password the link sets.' })
  name: string | null
  @Field(() => Date, { nullable: true }) expiresAt: Date | null
}
