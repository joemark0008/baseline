import { Module } from '@nestjs/common'
import { AccessModule } from './access/access.module.js'
import { AppAuthModule } from './auth/auth.module.js'
import { EnvModule } from './config/env.module.js'
import { ApiGraphQLModule } from './graphql/graphql.module.js'
import { HealthModule } from './health/health.module.js'
import { InvitesModule } from './invites/invites.module.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { UsersModule } from './users/users.module.js'
import { SetupModule } from './setup/setup.module.js'
import { RolesModule } from './roles/roles.module.js'
import { AuthPasswordsModule } from './auth/auth-passwords.module.js'
import { PasswordResetModule } from './password-reset/password-reset.module.js'
import { RateLimitModule } from './rate-limit/rate-limit.module.js'

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    AccessModule,
    AppAuthModule,
    // After AppAuthModule: its guard attaches the session the rate-limit guard keys on.
    RateLimitModule,
    AuthPasswordsModule,
    ApiGraphQLModule,
    HealthModule,
    UsersModule,
    InvitesModule,
    SetupModule,
    RolesModule,
    PasswordResetModule,
  ],
})
export class AppModule {}
