import { ArgsType, Field, Int } from '@nestjs/graphql'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

export const DEFAULT_PER_PAGE = 10
export const MAX_PER_PAGE = 200

/** Standard `page` / `perPage` arguments for every list query. */
@ArgsType()
export class PageArgs {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number

  @Field(() => Int, { nullable: true, defaultValue: DEFAULT_PER_PAGE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PER_PAGE)
  perPage?: number
}
