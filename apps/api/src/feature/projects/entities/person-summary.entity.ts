import { Field, ID, ObjectType } from '@nestjs/graphql'

/** Enough of a person to show who owns, authored or belongs to something. */
@ObjectType()
export class PersonSummary {
  @Field(() => ID) id: string
  @Field() name: string
  @Field() email: string
  @Field(() => String, { nullable: true }) image: string | null
}
