import { Injectable } from '@nestjs/common'
import { APIError } from 'better-auth/api'
import { BeforeHook, Hook, type AuthHookContext } from '@thallesp/nestjs-better-auth'

/**
 * Better Auth endpoints that would change roles, deactivation or passwords behind the app's back
 * (no permission check, no audit record). The GraphQL operations are the only way in.
 */
export const BLOCKED_HTTP_PATHS: ReadonlySet<string> = new Set([
  '/admin/set-role',
  '/admin/ban-user',
  '/admin/unban-user',
  '/admin/remove-user',
  '/admin/update-user',
  '/admin/create-user',
  '/admin/set-user-password',
  // Passwords change only through the password-reset feature (feature 002).
  '/change-password',
  '/set-password',
  '/request-password-reset',
  '/reset-password',
  '/reset-password/:token',
])

/** Rejects the paths above over HTTP. Server calls (`auth.api.*`, no request) still work. */
@Hook()
@Injectable()
export class BlockAdminEndpointsHook {
  @BeforeHook()
  async block(ctx: AuthHookContext): Promise<void> {
    if (ctx.request && BLOCKED_HTTP_PATHS.has(ctx.path)) {
      throw new APIError('FORBIDDEN', {
        message: 'Use the app to manage people, roles and passwords.',
      })
    }
  }
}
