import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import type { Action } from './actions.js'
import type { AreaKey } from './areas.js'
import { PermissionGuard } from './permission.guard.js'

export const REQUIRED_PERMISSION = 'access:required-permission'

export interface RequiredPermission {
  area: AreaKey
  action: Action
}

/**
 * Marks an operation as needing `action` on `area`. Runs after the global Better Auth guard, so
 * the session is already on the request.
 */
export function RequirePermission(area: AreaKey, action: Action): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(REQUIRED_PERMISSION, { area, action } satisfies RequiredPermission),
    UseGuards(PermissionGuard),
  )
}
