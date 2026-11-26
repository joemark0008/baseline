import { registerEnumType } from '@nestjs/graphql'

/** The four things a role can be allowed to do on an area. */
export const ACTIONS = ['view', 'add', 'edit', 'delete'] as const
export type Action = (typeof ACTIONS)[number]

/** GraphQL exposes VIEW/ADD/EDIT/DELETE; the stored values are the lower-case strings. */
export enum PermissionAction {
  VIEW = 'view',
  ADD = 'add',
  EDIT = 'edit',
  DELETE = 'delete',
}

registerEnumType(PermissionAction, { name: 'PermissionAction' })

export function isAction(value: string): value is Action {
  return (ACTIONS as readonly string[]).includes(value)
}
