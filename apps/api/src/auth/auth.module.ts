import { Module } from '@nestjs/common'
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth'
import { loadEnv } from '../config/env.js'
import { InvitesModule } from '../feature/invites/invites.module.js'
import { authRefusalLogger } from '../rate-limit/auth-refusal-logger.js'
import { auth } from './auth.config.js'
import { BlockAdminEndpointsHook } from './hooks/block-admin-endpoints.hook.js'
import { SignUpInviteHook } from './hooks/sign-up-invite.hook.js'

/**
 * Registers Better Auth (global AuthGuard included) and the project's auth hooks. The
 * `middleware` wraps Better Auth's handler only to log its rate-limit refusals (feature 003).
 */
@Module({
  imports: [
    BetterAuthModule.forRoot({ auth, middleware: authRefusalLogger(loadEnv()) }),
    InvitesModule,
  ],
  providers: [SignUpInviteHook, BlockAdminEndpointsHook],
})
export class AppAuthModule {}
