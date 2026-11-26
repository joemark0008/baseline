import { Field, ID, InputType } from '@nestjs/graphql'
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'
import { LEGACY_ROLE_DEPRECATION, UserRole } from '../../common/user-role.enum.js'

@InputType()
export class InviteUserInput {
  @Field() @IsEmail() email: string

  @Field(() => ID, { nullable: true, description: 'The role to join; Member when omitted.' })
  @IsOptional()
  @IsString()
  roleId?: string | null

  @Field(() => UserRole, { nullable: true, deprecationReason: LEGACY_ROLE_DEPRECATION })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole | null
}
