import { Field, ID, Int, ObjectType } from '@nestjs/graphql'
import { RoleCapabilities } from '../../access/entities/capabilities.entity.js'
import { RoleKind } from '../../access/role-kind.js'
import { Grant } from './grant.entity.js'

@ObjectType()
export class Role {
  @Field(() => ID) id: string
  @Field() name: string
  @Field(() => String, { nullable: true }) description: string | null
  @Field(() => RoleKind) kind: RoleKind
  @Field(() => [Grant], { description: 'Admin: every permission in the catalogue.' })
  grants: Grant[]
  @Field(() => Int) memberCount: number
  @Field(() => Int) pendingInviteCount: number
  /** Resolved per caller by `RolesResolver.can`. */
  @Field(() => RoleCapabilities, { description: 'What you may do with this role.' })
  can?: RoleCapabilities
}
