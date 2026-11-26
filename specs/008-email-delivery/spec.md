# Feature Specification: Email Delivery

**Feature Branch**: `008-email-delivery`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "implement resend for email https://resend.com/docs/introduction"

**Context**: Today the application sends no email. Invite links and password-reset links are returned once to the administrator, who delivers them by hand. Feature 007 (HIS implementation workspace) decided in its 2026-11-26 clarification that project invites, @mentions and task assignments send email through Resend. This feature adds the email capability and wires the two flows that already produce links; the 007 notifications reuse it.

## Clarifications

### Session 2026-11-26

- Q: Which provider? → A: Resend (https://resend.com), chosen by the user.
- Q: What happens without an API key? → A: The application still works: emails are written to the application log instead, and the administrator keeps the link to deliver by hand.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Invitee receives the invitation by email (Priority: P1)

An administrator invites a person by email. The person receives an email with the invitation link and the role they were invited into, and can join without the administrator forwarding anything. The administrator still sees the link once as a backup.

**Why this priority**: Invite-only sign-up is the entry point for every user; hand-delivered links are the main friction today and 007 depends on email invites.

**Independent Test**: Invite an address, verify the invite email is handed to the email provider with the correct link and role, and that the mutation result reports the email as sent.

**Acceptance Scenarios**:

1. **Given** email delivery is configured, **When** an administrator invites a person, **Then** an email with the invitation link, the role name and the expiry is sent to that address and the result reports `emailSent: true` together with the backup link.
2. **Given** email delivery is not configured, **When** an administrator invites a person, **Then** the invite is still created, the result reports `emailSent: false`, the link is shown for manual delivery, and the would-be email is written to the application log.
3. **Given** the email provider rejects or fails the send, **When** an administrator invites a person, **Then** the invite is still created, the result reports `emailSent: false`, and the failure is logged with the provider's message.

---

### User Story 2 - Person receives a password-reset link by email (Priority: P1)

An administrator creates a password-reset link for a person. The person receives it by email. The administrator still sees the link once.

**Independent Test**: Create a reset link for a user, verify the reset email goes to the user's account email with the link and expiry, and the result reports whether it was sent.

**Acceptance Scenarios**:

1. **Given** email delivery is configured, **When** an administrator creates a reset link, **Then** the person's account email receives the link and expiry and the result reports `emailSent: true`.
2. **Given** email delivery is not configured or the send fails, **When** an administrator creates a reset link, **Then** the link is still created and shown, the result reports `emailSent: false`, and the outcome is logged.

---

### User Story 3 - Administrator sees whether the email went out (Priority: P2)

In the admin screens, after inviting someone or creating a reset link, the administrator sees whether the email was sent, so they know whether to forward the link themselves.

**Acceptance Scenarios**:

1. **Given** `emailSent: true`, **When** the result is shown, **Then** the screen says the email was sent to the address and offers the link as a backup.
2. **Given** `emailSent: false`, **When** the result is shown, **Then** the screen says to send the link yourself, as it does today.

### Edge Cases

- The provider is slow or unreachable: the originating mutation MUST still complete; sending has a bounded timeout and failures are logged, never raised to the caller.
- The same invite is re-issued for an address: the newer email carries the newer link; the older link is already expired by the invite service.
- A `from` address on an unverified domain: the provider rejects it; the failure is logged with the provider's message so the administrator can fix configuration.
- Recipient addresses are never logged in full in production logs beyond what the existing invite and access-change records already store.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST send an invitation email containing the invitation link, the invited role name and the expiry when an invite is created.
- **FR-002**: The system MUST send a password-reset email containing the reset link and the expiry to the account's email when an administrator creates a reset link.
- **FR-003**: Email delivery MUST use Resend as the provider, configured by `RESEND_API_KEY` and a sender address `EMAIL_FROM` (display name and address). An optional `EMAIL_REPLY_TO` MAY be set.
- **FR-004**: When `RESEND_API_KEY` is unset, the system MUST NOT fail to start or to perform invites and resets; it MUST write each would-be email (recipient, subject, link) to the application log at info level instead.
- **FR-005**: A failed or skipped send MUST NOT fail the originating action. The action's result MUST report `emailSent` (true only when the provider accepted the message), and failures MUST be logged with the provider's error message.
- **FR-006**: Each send MUST carry an idempotency key derived from the event and entity (for example `invite/<inviteId>`) so a retried request does not send the same email twice.
- **FR-007**: The admin screens for inviting and for reset links MUST show whether the email was sent and keep showing the link once as a backup.
- **FR-008**: Email templates MUST be plain, accessible HTML with a text alternative, use the product name, and contain no secrets other than the one-time link itself.

### Key Entities

No persisted entities. `EmailMessage` (to, subject, html, text, idempotencyKey) is a transient value handed to the provider.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: With a valid key and verified sender, 100% of invites and reset links created in the admin screens produce one provider-accepted email, verified by the provider's returned message id in the log.
- **SC-002**: With no key, 100% of invites and reset links still succeed and each produces one log line with the recipient, subject and link.
- **SC-003**: A provider failure never produces a GraphQL error for `inviteUser` or `createPasswordResetLink`.
- **SC-004**: An administrator can tell from the screen, without reading logs, whether to forward a link.

## Assumptions

- The sender domain is verified in Resend by the operator; until then the Resend test sender `onboarding@resend.dev` is used and only delivers to the Resend account's own addresses.
- Resend's default limit of 10 requests per second is far above this application's send rate; no queue is needed.
- Project-level notification emails (mentions, assignments, project invites) from feature 007 will call the same email service with their own templates.
