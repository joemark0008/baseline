import { Inject, Logger, Module, type OnModuleInit } from '@nestjs/common'
import { APP_GUARD, Reflector } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_ENV, type AppEnv, type RateLimitRule } from '../config/env.js'
import { RateLimitGuard } from './rate-limit.guard.js'
import { buildThrottlerOptions } from './rate-limit.options.js'

const describeRule = (r: RateLimitRule): string => `${r.max}/${r.windowSeconds}s`

/** Cross-cutting rate limiting (feature 003). Import it after `AppAuthModule`: the guard reads the session. */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [APP_ENV, Reflector],
      useFactory: buildThrottlerOptions,
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class RateLimitModule implements OnModuleInit {
  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  onModuleInit(): void {
    const { signIn, links, general } = this.env.rateLimit
    Logger.log(
      `Rate limits: sign-in ${describeRule(signIn)}, links ${describeRule(links)}, general ${describeRule(general)}`,
      'RateLimit',
    )
  }
}
