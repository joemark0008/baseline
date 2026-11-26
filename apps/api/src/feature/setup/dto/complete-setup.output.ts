import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class CompleteSetupResult {
  @Field() email: string
}
