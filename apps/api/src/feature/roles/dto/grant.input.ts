import { Field, InputType } from '@nestjs/graphql'
import { IsEnum, IsString } from 'class-validator'
import { PermissionAction } from '../../access/actions.js'

@InputType()
export class GrantInput {
  @Field() @IsString() area: string
  @Field(() => PermissionAction) @IsEnum(PermissionAction) action: PermissionAction
}
