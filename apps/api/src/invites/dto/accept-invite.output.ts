import { Field, ObjectType } from '@nestjs/graphql'
import { LEGACY_ROLE_DEPRECATION, UserRole } from '../../common/user-role.enum.js'

@ObjectType()
export class AcceptInviteResult {
  @Field(() => UserRole, { deprecationReason: LEGACY_ROLE_DEPRECATION }) role: UserRole
  @Field() roleName: string
}
