import { Field, ID, InputType } from '@nestjs/graphql'
import { Type } from 'class-transformer'
import { IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator'
import { GrantInput } from './grant.input.js'

/** Omitted fields stay as they are. */
@InputType()
export class UpdateRoleInput {
  @Field(() => ID) @IsString() id: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string | null

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null

  @Field(() => [GrantInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => GrantInput)
  grants?: GrantInput[] | null
}
