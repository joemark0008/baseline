import type { CreateEmailOptions, CreateEmailRequestOptions } from 'resend'
import {
  EMAIL_SEND_TIMEOUT_MS,
  type EmailMessage,
  type EmailSendResult,
  type EmailTransport,
} from './email.transport.js'

/** The part of the SDK's response the transport reads; the real response carries more. */
export interface ResendSendResponse {
  data: { id: string } | null
  error: { name: string; message: string } | null
}

/** The one SDK call the transport makes; `Resend` satisfies it, and specs pass a fake. */
export interface ResendClient {
  emails: {
    send(
      payload: CreateEmailOptions,
      requestOptions?: CreateEmailRequestOptions,
    ): Promise<ResendSendResponse>
  }
}

/** Sends through Resend (https://resend.com). The SDK reports failures as `{ error }`; network errors throw. */
export class ResendTransport implements EmailTransport {
  readonly name = 'resend'

  constructor(
    private readonly client: ResendClient,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const response = await withTimeout(
        this.client.emails.send(
          {
            from: this.from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            ...(message.replyTo ? { replyTo: message.replyTo } : {}),
          },
          { idempotencyKey: message.idempotencyKey },
        ),
        EMAIL_SEND_TIMEOUT_MS,
      )
      if (response.error) {
        return { ok: false, error: `${response.error.name}: ${response.error.message}` }
      }
      return { ok: true, id: response.data?.id ?? '' }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Email provider did not answer within ${ms} ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
