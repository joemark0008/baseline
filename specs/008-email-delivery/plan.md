# Implementation Plan: Email Delivery

**Branch**: `008-email-delivery` | **Date**: 2026-11-26 | **Spec**: `specs/008-email-delivery/spec.md`

**Input**: Feature specification from `/specs/008-email-delivery/spec.md`

## Summary

Add a cross-cutting email capability to the API (`apps/api/src/email/`): an `EmailService` over an `EmailTransport` with a Resend implementation and a log fallback, plus plain HTML/text templates. Wire it into the two flows that already issue one-time links, invites and password resets, so the link is emailed and the GraphQL results report `emailSent`. The admin screens show whether the email went out and keep the link as a backup. Feature 007's project notifications will reuse the service.

## Technical Context

**Language/Version**: TypeScript 6 on Node.js 22; NestJS 12

**Primary Dependencies**: `resend` 6.x (new, API only); existing Nest, GraphQL, Prisma, Vitest; web unchanged except generated types

**Storage**: None added. No Prisma change.

**Testing**: Vitest unit specs beside the code (`Test.createTestingModule`, `useValue` fakes), a shared contract spec for both transports, React Testing Library for the two admin components

**Target Platform**: Same two containers; new env vars on the api

**Project Type**: Web application (api + web)

**Performance Goals**: A send never adds more than 10 s to a mutation (timeout) and normally well under 1 s

**Constraints**: Sending never fails the originating mutation; no secrets in templates or logs; recipient address appears in logs only where the invite and access records already hold it

**Scale/Scope**: Two email kinds now; well under Resend's 10 requests/second

## Constitution Check

- **I. Single Responsibility**: `EmailService` composes templates and delegates sending; each transport talks to one destination; templates are pure functions; the feature services keep their lifecycle rules and only call `EmailService`.
- **II. Open/Closed**: A new email kind is a new template function and a new `EmailService` method; a new provider is a new transport. Neither edits the other.
- **III. Liskov Substitution**: `ResendTransport` and `LogTransport` both pass `email-transport.contract.spec.ts`; `EmailService` never checks which one it has.
- **IV. Interface Segregation**: `EmailTransport` has one method; feature services see only `sendInvite` / `sendPasswordReset`.
- **V. Dependency Inversion**: The transport is injected by token (`EMAIL_TRANSPORT`) from `EmailModule`; the Resend SDK client is injected into `ResendTransport` so the spec replaces it with a fake. Resolvers contain no sending logic.
- **Technology Stack**: One new runtime dependency (`resend`) justified by the user's provider choice. No schema migration. `schema.graphql` is regenerated and committed; the web uses generated types.
- **Design before code**: Modules, services, DTO changes and files are listed below. No new resolver or route; two existing mutations gain a field.
- **Tests**: Unit specs for templates, both transports (contract), the service, env parsing, the two feature services and resolvers; web component tests for the two screens. Red before green.

**Gate result**: Pass.

## Project Structure

### Documentation (this feature)

```text
specs/008-email-delivery/
├── spec.md
├── plan.md
├── research.md
├── contracts/email-transport.md
├── quickstart.md
└── tasks.md
```

### Source Code

```text
apps/api/src/email/                      cross-cutting (like rate-limit/)
├── email.module.ts                      @Global; provides EMAIL_TRANSPORT (resend | log) and EmailService
├── email.transport.ts                   EmailMessage, EmailSendResult, EmailTransport, EMAIL_TRANSPORT token
├── resend.transport.ts                  ResendTransport (SDK client injected), 10 s timeout
├── log.transport.ts                     LogTransport (writes to Logger, returns a generated id)
├── email.templates.ts                   inviteEmail(), passwordResetEmail() → { subject, html, text }
├── email.service.ts                     sendInvite(), sendPasswordReset(); never throws; logs outcome
├── email-transport.contract.spec.ts     shared contract run against both transports
├── resend.transport.spec.ts
├── email.templates.spec.ts
└── email.service.spec.ts
apps/api/src/config/env.ts               email: { resendApiKey?, from, replyTo? } (+ env.spec.ts)
apps/api/src/feature/invites/
├── invites.service.ts                   builds inviteUrl, calls EmailService, returns emailSent
├── invites.resolver.ts                  maps { invite, inviteUrl, emailSent }
└── dto/invite-user.output.ts            + emailSent: Boolean!
apps/api/src/feature/password-reset/
├── password-reset.service.ts            builds url, calls EmailService, returns emailSent
├── password-reset.resolver.ts           maps { url, expiresAt, emailSent }
└── entities/password-reset-link.entity.ts   + emailSent: Boolean!
apps/api/schema.graphql                  regenerated
apps/web/src/feature/admin/users/
├── operations.ts                        selects emailSent on both mutations
├── components/InviteForm.tsx            "Invitation emailed to …" vs "send this link yourself"
└── components/ResetLinkDialog.tsx       same for reset links
.env.example                             RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO
```

**Structure Decision**: `email/` is cross-cutting infrastructure (no domain, no resolver), so it sits beside `rate-limit/` rather than under `feature/`. The two feature services own the orchestration because they own the link lifecycle.

## Module wiring

- `EmailModule` (`@Global`) is imported once in `AppModule` after `EnvModule`. Providers: `{ provide: EMAIL_TRANSPORT, inject: [APP_ENV], useFactory }` choosing `ResendTransport(new Resend(key))` or `LogTransport()`; `EmailService`. Exports `EmailService`.
- `InvitesService` and `PasswordResetService` inject `EmailService` and `APP_ENV`. Their specs add `{ provide: EmailService, useValue: fake }`.
- `buildInviteUrl` / `buildResetUrl` move next to the services (`links.ts` in each feature) and stay re-exported from the resolver files for the existing e2e imports.

## Deployment Notes

- New api env vars (Coolify service `baseline`): `RESEND_API_KEY` (secret, optional), `EMAIL_FROM`, `EMAIL_REPLY_TO` (optional). Without the key the deployment keeps working with the log transport.
- Rebuild the api and web images and redeploy the service.

## Complexity Tracking

| Addition                   | Justification                                                                                       | Simpler alternative rejected                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `EmailTransport` interface | Two real implementations (Resend, log) with a shared contract test; chosen by configuration at boot | One class with `if (apiKey)` branches mixes two behaviours and cannot be contract-tested |
| `resend` dependency        | Provider chosen by the user                                                                         | Hand-written HTTPS client would re-implement the SDK's typing and idempotency support    |
