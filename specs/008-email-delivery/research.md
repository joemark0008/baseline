# Research: Email Delivery

## Decision 1: Resend via the official `resend` npm SDK (6.x)

- **Decision**: Use `new Resend(apiKey)` and `resend.emails.send({ from, to, subject, html, text, replyTo, idempotencyKey })`. The SDK returns `{ data: { id }, error: null }` on success and `{ data: null, error: { name, message } }` on failure instead of throwing; only network-level failures throw.
- **Rationale**: The user chose Resend. The SDK is small, typed, and its non-throwing result maps directly onto the "never fail the originating action" rule.
- **Alternatives considered**: Raw HTTPS calls to the Resend API (more code, no typing); nodemailer over SMTP (Resend supports SMTP, but the SDK gives idempotency keys and typed errors).

## Decision 2: One `EmailTransport` interface with two implementations

- **Decision**: `EmailService` depends on an `EmailTransport` (`send(message) → { ok, id? , error? }`). `ResendTransport` wraps the SDK; `LogTransport` writes the message to the Nest logger. The module picks the transport at boot from `RESEND_API_KEY`.
- **Rationale**: Two real implementations exist from day one (constitution: an abstraction needs a second implementation), both run the same contract test, and every environment without a key (local, CI, e2e, a fresh deploy) keeps working and shows what would have been sent.
- **Alternatives considered**: Making the SDK optional inside one class with `if (apiKey)` branches (two behaviours in one unit, harder to test); throwing at boot when the key is missing (breaks local and e2e runs).

## Decision 3: Sending lives in the feature services, not the resolvers

- **Decision**: `InvitesService.inviteUser` and `PasswordResetService.create` build the link (they get `APP_ENV`), call `EmailService`, and return `emailSent` alongside the token. Resolvers only map results.
- **Rationale**: Constitution V: business rules and orchestration live in services; resolvers contain no rules. The services already own the invite and reset lifecycle.
- **Alternatives considered**: Sending from the resolver after the service returns (puts orchestration in the resolver); a Nest event emitter (indirection with a single subscriber).

## Decision 4: Idempotency keys and timeouts

- **Decision**: `invite/<inviteId>` and `password-reset/<userId>/<expiresAt epoch>` as idempotency keys (Resend keeps them 24 hours). The transport bounds a send to 10 seconds with `AbortSignal.timeout`; a timeout is a failed send.
- **Rationale**: FR-006 and the slow-provider edge case.

## Decision 5: Sender configuration

- **Decision**: `EMAIL_FROM` defaults to `baseline <onboarding@resend.dev>`, Resend's test sender, and `EMAIL_REPLY_TO` is optional. At boot the module logs which transport is active and warns when the test sender is used in production.
- **Rationale**: Works out of the box for trying it; the warning tells the operator to verify a domain before real use.
