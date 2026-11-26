import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class SetupStatus {
  @Field() setupComplete: boolean
  @Field(() => Int) minPasswordLength: number
}
