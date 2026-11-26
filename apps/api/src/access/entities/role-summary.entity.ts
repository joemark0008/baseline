import { Field, ID, ObjectType } from '@nestjs/graphql'
import { RoleKind } from '../role-kind.js'

/** A role's identity, used wherever a person or invite shows which role it has. */
@ObjectType()
export class RoleSummary {
  @Field(() => ID) id: string
  @Field() name: string
  @Field(() => RoleKind) kind: RoleKind
}
