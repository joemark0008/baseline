import { Field, Int, ObjectType } from '@nestjs/graphql'

/** The password rules, so forms show what the server enforces. */
@ObjectType()
export class PasswordPolicy {
  @Field(() => Int) minLength: number
  @Field(() => Int) maxLength: number
}
