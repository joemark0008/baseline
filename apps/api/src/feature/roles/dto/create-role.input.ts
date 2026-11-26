import { Field, InputType } from '@nestjs/graphql'
import { Type } from 'class-transformer'
import { IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator'
import { GrantInput } from './grant.input.js'

/** data-model.md › Role.name (2–50, trimmed) and Role.description (≤ 200). */
@InputType()
export class CreateRoleInput {
  @Field() @IsString() @Length(2, 50) name: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null

  @Field(() => [GrantInput])
  @ValidateNested({ each: true })
  @Type(() => GrantInput)
  grants: GrantInput[]
}
