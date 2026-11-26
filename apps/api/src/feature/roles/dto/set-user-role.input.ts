import { Field, ID, InputType } from '@nestjs/graphql'
import { IsString } from 'class-validator'

@InputType()
export class SetUserRoleInput {
  @Field(() => ID) @IsString() userId: string
  @Field(() => ID) @IsString() roleId: string
}
