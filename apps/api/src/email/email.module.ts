import { Global, Inject, Logger, Module, type OnModuleInit } from '@nestjs/common'
import { Resend } from 'resend'
import { APP_ENV, type AppEnv, DEFAULT_EMAIL_FROM } from '../config/env.js'
import { EmailService } from './email.service.js'
import { EMAIL_TRANSPORT, type EmailTransport } from './email.transport.js'
import { LogTransport } from './log.transport.js'
import { ResendTransport } from './resend.transport.js'

export function chooseTransport(env: AppEnv): EmailTransport {
  const { resendApiKey, from } = env.email
  return resendApiKey ? new ResendTransport(new Resend(resendApiKey), from) : new LogTransport()
}

/** Cross-cutting email delivery (feature 008). Global: feature services inject `EmailService`. */
@Global()
@Module({
  providers: [
    { provide: EMAIL_TRANSPORT, inject: [APP_ENV], useFactory: chooseTransport },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule implements OnModuleInit {
  constructor(
    @Inject(EMAIL_TRANSPORT) private readonly transport: EmailTransport,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  onModuleInit(): void {
    Logger.log(`Email transport: ${this.transport.name} (from ${this.env.email.from})`, 'Email')
    if (this.transport.name === 'resend' && this.env.email.from === DEFAULT_EMAIL_FROM) {
      Logger.warn(
        'EMAIL_FROM is the Resend test sender; it delivers only to your own Resend account. Verify a domain and set EMAIL_FROM.',
        'Email',
      )
    }
  }
}
