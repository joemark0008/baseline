---
description: 'Executable tasks for email delivery through Resend'
---

# Tasks: Email Delivery

**Input**: Design documents from `/specs/008-email-delivery/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `contracts/email-transport.md`, `quickstart.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable when files do not overlap.
- Tests first: each test task is run and observed failing before its implementation task.

## Phase 1: Setup

- [x] T001 Add the `resend` dependency to `apps/api/package.json` (lockfile updated) and the `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` entries to `.env.example`.
- [x] T002 [P] Extend `apps/api/src/config/env.ts` with `email: { resendApiKey?, from, replyTo? }` (default from `baseline <onboarding@resend.dev>`) and cover it in `apps/api/src/config/env.spec.ts`.

## Phase 2: Foundational - the email module (blocks both stories)

- [x] T003 [P] Write `apps/api/src/email/email-transport.contract.spec.ts` (never throws, bounded time, non-empty id, message untouched) and `apps/api/src/email/email.templates.spec.ts` (subject, link, role, expiry, text alternative, no HTML in text); run them and confirm they fail.
- [x] T004 [P] Write `apps/api/src/email/email.service.spec.ts` (sendInvite/sendPasswordReset hand the rendered message and idempotency key to the transport, return `true` only on `ok`, log and return `false` on failure or throw) and `apps/api/src/email/resend.transport.spec.ts` (maps SDK `{data}`/`{error}` and a thrown network error; passes `idempotencyKey`, `replyTo`); confirm they fail.
- [x] T005 Implement `apps/api/src/email/email.transport.ts`, `log.transport.ts`, `resend.transport.ts`, `email.templates.ts`, `email.service.ts` and `email.module.ts` (@Global, transport chosen from env, boot log line, production warning for the test sender); import `EmailModule` in `apps/api/src/app.module.ts`.
- [x] T006 Run the email specs and confirm they pass.

## Phase 3: User Story 1 - Invitation by email (Priority: P1) 🎯 MVP

- [x] T007 [US1] Add failing assertions to `apps/api/src/feature/invites/invites.service.spec.ts` (invite email sent with the link, role name and expiry; `emailSent` mirrors the transport result; a failed send still creates the invite) and to `apps/api/src/feature/invites/invites.resolver.spec.ts` (result carries `emailSent`).
- [x] T008 [US1] Move URL building to `apps/api/src/feature/invites/links.ts`, inject `EmailService` and `APP_ENV` into `InvitesService.inviteUser`, return `{ invite, token, inviteUrl, emailSent }`, map it in `invites.resolver.ts`, add `emailSent` to `dto/invite-user.output.ts`.
- [x] T009 [US1] Run the invites specs and confirm they pass.

## Phase 4: User Story 2 - Password reset by email (Priority: P1)

- [x] T010 [US2] Add failing assertions to `apps/api/src/feature/password-reset/password-reset.service.spec.ts` and `password-reset.resolver.spec.ts` mirroring T007 for reset links (sent to the account email).
- [x] T011 [US2] Move URL building to `apps/api/src/feature/password-reset/links.ts`, inject `EmailService` and `APP_ENV` into `PasswordResetService.create`, return `{ token, url, expiresAt, emailSent }`, map it in the resolver, add `emailSent` to `entities/password-reset-link.entity.ts`.
- [x] T012 [US2] Run the password-reset specs and confirm they pass; run `npm run schema:generate` and commit `apps/api/schema.graphql`.

## Phase 5: User Story 3 - Admin sees the outcome (Priority: P2)

- [x] T013 [US3] Add failing assertions to `apps/web/src/feature/admin/users/components/InviteForm.test.tsx` and a new `ResetLinkDialog.test.tsx` for the two messages ("emailed to …" with backup link vs "send this link yourself").
- [x] T014 [US3] Select `emailSent` in `apps/web/src/feature/admin/users/operations.ts`, run `npm run codegen -w apps/web`, thread it through `index.tsx`, `InviteForm.tsx` and `ResetLinkDialog.tsx`.
- [x] T015 [US3] Run the web tests and confirm they pass.

## Phase 6: Polish and verification

- [x] T016 Run `npm test -w apps/api`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` for both apps.
- [x] T017 Set `EMAIL_FROM` (and `RESEND_API_KEY` when provided) on the Coolify service `baseline`, rebuild both images, redeploy, and confirm the boot log names the active transport.
- [ ] T018 Validate the quickstart: invite an address and observe either the sent email or the `[Email] would send` log line.

## Dependencies & Execution Order

- T001–T002 first; T003–T006 before any story; US1 and US2 touch different features and may run in parallel after T006; US3 needs the regenerated schema from T012.
