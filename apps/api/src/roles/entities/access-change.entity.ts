import { Field, ID, ObjectType } from '@nestjs/graphql'

/** One line of the access History page. */
@ObjectType()
export class AccessChange {
  @Field(() => ID) id: string
  @Field() kind: string
  @Field(() => String, { nullable: true, description: 'Who made the change, if still known.' })
  actorName: string | null
  @Field(() => ID, { nullable: true }) roleId: string | null
  @Field(() => ID, { nullable: true }) userId: string | null
  @Field() summary: string
  @Field() createdAt: Date
}
