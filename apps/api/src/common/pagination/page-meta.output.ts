import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class PageMeta {
  @Field(() => Int) total: number
  @Field(() => Int) lastPage: number
  @Field(() => Int) currentPage: number
  @Field(() => Int) perPage: number
  @Field(() => Int, { nullable: true }) prev: number | null
  @Field(() => Int, { nullable: true }) next: number | null
  @Field() hasNextPage: boolean
  @Field() hasPrevPage: boolean
}
