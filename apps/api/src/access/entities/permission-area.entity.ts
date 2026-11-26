import { Field, ObjectType } from '@nestjs/graphql'
import { PermissionAction } from '../actions.js'

@ObjectType()
export class AreaAction {
  @Field(() => PermissionAction) action: PermissionAction
  @Field() description: string
  @Field(() => [PermissionAction], { description: 'Granted along with this action.' })
  requires: PermissionAction[]
}

/** One row of the roles grid: an area and the actions it offers. */
@ObjectType()
export class PermissionArea {
  @Field() key: string
  @Field() name: string
  @Field(() => [AreaAction], { description: 'Only the actions this area offers.' })
  actions: AreaAction[]
}
