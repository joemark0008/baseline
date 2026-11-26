/** One outbound email, already rendered. The sender address belongs to the transport. */
export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  /** Stable per event and entity (e.g. `invite/<id>`) so a retried request sends once. */
  idempotencyKey: string
}

export type EmailSendResult = { ok: true; id: string } | { ok: false; error: string }

/**
 * Where emails go (feature 008). Implementations never throw: a provider or network failure is
 * `{ ok: false }`. The shared contract lives in `email-transport.contract.spec.ts`.
 */
export interface EmailTransport {
  readonly name: string
  send(message: EmailMessage): Promise<EmailSendResult>
}

export const EMAIL_TRANSPORT = Symbol('EMAIL_TRANSPORT')

/** Upper bound for one send; a slower provider counts as a failed send. */
export const EMAIL_SEND_TIMEOUT_MS = 10_000
