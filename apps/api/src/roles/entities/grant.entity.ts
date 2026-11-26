import { Field, ObjectType } from '@nestjs/graphql'
import { PermissionAction } from '../../access/actions.js'

/** One ticked box of the roles grid. */
@ObjectType()
export class Grant {
  @Field() area: string
  @Field(() => PermissionAction) action: PermissionAction
}
