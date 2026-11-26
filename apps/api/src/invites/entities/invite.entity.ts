import { Field, ID, ObjectType } from '@nestjs/graphql'
import { RoleSummary } from '../../access/entities/role-summary.entity.js'
import { LEGACY_ROLE_DEPRECATION, UserRole } from '../../common/user-role.enum.js'

@ObjectType()
export class Invite {
  @Field(() => ID) id: string
  @Field() email: string
  @Field(() => UserRole, { deprecationReason: LEGACY_ROLE_DEPRECATION }) role: UserRole
  @Field(() => RoleSummary, { description: 'The role the invitee joins.' }) accessRole: RoleSummary
  @Field() expiresAt: Date
  @Field(() => Date, { nullable: true }) acceptedAt: Date | null
  @Field() createdAt: Date
}
