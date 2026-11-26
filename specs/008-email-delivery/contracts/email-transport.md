# Contract: EmailTransport

Every transport (`ResendTransport`, `LogTransport`, and any future one) MUST satisfy the shared
contract test `apps/api/src/email/email-transport.contract.spec.ts`:

```ts
interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  idempotencyKey: string
}
type EmailSendResult = { ok: true; id: string } | { ok: false; error: string }
interface EmailTransport {
  readonly name: string // shown in the boot log, e.g. "resend", "log"
  send(message: EmailMessage): Promise<EmailSendResult>
}
```

1. `send` never throws; a provider or network failure resolves to `{ ok: false, error }` with a
   human-readable message.
2. `send` resolves within 10 seconds.
3. A successful send returns a non-empty `id` (the provider's message id, or a generated one for
   the log transport).
4. The transport never mutates the message.

## GraphQL additions

```graphql
type InviteUserResult {
  invite: Invite!
  inviteUrl: String!
  emailSent: Boolean! # true only when the provider accepted the message
}
type PasswordResetLink {
  url: String!
  expiresAt: DateTime!
  emailSent: Boolean!
}
```

## Environment

| Variable         | Required | Default                            | Purpose                    |
| ---------------- | -------- | ---------------------------------- | -------------------------- |
| `RESEND_API_KEY` | no       | unset → log transport              | Resend API key (`re_…`)    |
| `EMAIL_FROM`     | no       | `baseline <onboarding@resend.dev>` | Sender shown to recipients |
| `EMAIL_REPLY_TO` | no       | unset                              | Reply-To header            |
