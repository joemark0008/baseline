import { Field, ID, InputType } from '@nestjs/graphql'
import { IsOptional, IsString, Length, Matches } from 'class-validator'

/** Name and username only: email changes are out of scope (FR-014c). */
@InputType()
export class UpdateUserInput {
  @Field(() => ID) @IsString() id: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string | null

  /** Better Auth's username plugin rules: 3–30 letters, digits, `_` or `.`. */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_.]{3,30}$/, {
    message: 'Username must be 3–30 letters, digits, underscores or dots',
  })
  username?: string | null
}
