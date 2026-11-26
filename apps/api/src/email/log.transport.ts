import { randomUUID } from 'node:crypto'
import { Logger } from '@nestjs/common'
import type { EmailMessage, EmailSendResult, EmailTransport } from './email.transport.js'

/** The subset of Nest's Logger the transport uses; injected so the contract spec can break it. */
export interface TransportLogger {
  log(message: string, context?: string): void
  error(message: string, context?: string): void
  warn(message: string, context?: string): void
}

const nestLogger: TransportLogger = {
  log: (m, c) => Logger.log(m, c),
  error: (m, c) => Logger.error(m, c),
  warn: (m, c) => Logger.warn(m, c),
}

/**
 * No provider configured: the email is written to the log so the operator can see what would have
 * gone out, and the caller keeps the link to deliver by hand.
 */
export class LogTransport implements EmailTransport {
  readonly name = 'log'

  constructor(private readonly logger: TransportLogger = nestLogger) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const link = firstLink(message.text)
      this.logger.log(
        `would send "${message.subject}" to ${message.to}${link ? ` — ${link}` : ''}`,
        'Email',
      )
      return { ok: true, id: `log-${randomUUID()}` }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }
}

function firstLink(text: string): string | undefined {
  return /https?:\/\/\S+/.exec(text)?.[0]
}
