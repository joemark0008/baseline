import { registerEnumType } from '@nestjs/graphql'

/** Mirrors the Prisma `RoleKind` enum (kept here so features never import the raw client). */
export const RoleKind = { ADMIN: 'ADMIN', MEMBER: 'MEMBER', CUSTOM: 'CUSTOM' } as const
export type RoleKind = (typeof RoleKind)[keyof typeof RoleKind]

registerEnumType(RoleKind, { name: 'RoleKind' })

/** Fixed ids of the built-in roles, created by the add_roles migration. */
export const ADMIN_ROLE_ID = 'role_admin'
export const MEMBER_ROLE_ID = 'role_member'
