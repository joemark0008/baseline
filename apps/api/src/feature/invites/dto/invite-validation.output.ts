import { Field, ObjectType } from '@nestjs/graphql'
import { LEGACY_ROLE_DEPRECATION, UserRole } from '../../../common/user-role.enum.js'

@ObjectType()
export class InviteValidation {
  @Field() valid: boolean
  @Field(() => String, { nullable: true }) email: string | null
  @Field(() => UserRole, { nullable: true, deprecationReason: LEGACY_ROLE_DEPRECATION })
  role: UserRole | null
  @Field(() => String, { nullable: true, description: 'Name of the role the invitee joins.' })
  roleName: string | null
}
