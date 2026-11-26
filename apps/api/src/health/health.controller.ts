import { Controller, Get } from '@nestjs/common'
import { AllowAnonymous } from '@thallesp/nestjs-better-auth'
import { ExemptFromRateLimit } from '../rate-limit/rate-limit.decorators.js'

/** Polled by the hosting platform: public and never rate limited. */
@Controller('health')
@ExemptFromRateLimit()
export class HealthController {
  @Get()
  @AllowAnonymous()
  check(): { status: 'ok' } {
    return { status: 'ok' }
  }
}
