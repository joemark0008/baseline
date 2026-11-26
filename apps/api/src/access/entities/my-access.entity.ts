import { Field, ObjectType } from '@nestjs/graphql'
import { RoleSummary } from './role-summary.entity.js'

@ObjectType()
export class MyAccess {
  @Field(() => RoleSummary) role: RoleSummary
  @Field(() => [String], { description: '"area:action" strings, e.g. "users:view".' })
  permissions: string[]
}
