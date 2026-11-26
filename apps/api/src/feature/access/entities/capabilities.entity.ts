import { Field, ObjectType } from '@nestjs/graphql'

/** What the signed-in caller may do to this person. Computed on the server; the UI only reads it. */
@ObjectType()
export class UserCapabilities {
  @Field() edit: boolean
  @Field() changeRole: boolean
  @Field() deactivate: boolean
  @Field() reactivate: boolean
  @Field({ description: 'Create a one-time password reset link for this person.' })
  resetPassword: boolean
  @Field({ description: 'Change this password from Settings → Account (your own record).' })
  changePassword: boolean
}

/** What the signed-in caller may do with this role. Computed on the server; the UI only reads it. */
@ObjectType()
export class RoleCapabilities {
  @Field({ description: 'People can be put in this role by the caller.' }) assign: boolean
  @Field({ description: 'Change the description.' }) edit: boolean
  @Field() rename: boolean
  @Field() editGrants: boolean
  @Field({ description: 'Custom, unused, and the caller has roles:delete.' }) delete: boolean
}
