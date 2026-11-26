import { Field, ID, ObjectType } from '@nestjs/graphql'
import { UserCapabilities } from '../../access/entities/capabilities.entity.js'
import { RoleSummary } from '../../access/entities/role-summary.entity.js'
import { LEGACY_ROLE_DEPRECATION, UserRole } from '../../../common/user-role.enum.js'

@ObjectType()
export class User {
  @Field(() => ID) id: string
  @Field() name: string
  @Field() email: string
  @Field(() => String, { nullable: true }) username: string | null
  @Field(() => UserRole, { nullable: true, deprecationReason: LEGACY_ROLE_DEPRECATION })
  role: UserRole | null
  @Field(() => RoleSummary, { description: "The person's role." }) accessRole: RoleSummary
  @Field({ description: 'Deactivated people cannot sign in.' }) deactivated: boolean
  @Field(() => String, { nullable: true }) image: string | null
  @Field() createdAt: Date
  /** Resolved per caller by `UsersResolver.can`. */
  @Field(() => UserCapabilities, { description: 'What you may do to this person.' })
  can?: UserCapabilities
}
