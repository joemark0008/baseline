import { registerEnumType } from '@nestjs/graphql'

/** GraphQL exposes ADMIN/USER; the stored Better Auth `user.role` values are the strings. */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

registerEnumType(UserRole, { name: 'UserRole' })

/** Maps a stored role string to the enum; unknown or missing roles become `null`. */
export function toUserRole(role: string | null | undefined): UserRole | null {
  return role === UserRole.ADMIN || role === UserRole.USER ? role : null
}

/** The deprecated admin/user value for a role: Admin ⇒ ADMIN, any other role ⇒ USER. */
export function legacyRoleFor(kind: string): UserRole {
  return kind === 'ADMIN' ? UserRole.ADMIN : UserRole.USER
}

export const LEGACY_ROLE_DEPRECATION = 'Use accessRole; admin/user is derived from the role.'
