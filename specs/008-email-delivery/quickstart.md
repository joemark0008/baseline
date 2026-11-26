# Quickstart: Email Delivery

## Without a key (default)

Run the API as usual. Invite someone from Admin → Users. The screen says the email was not sent
and shows the link; the API log has one line starting with `[Email] would send` with the
recipient, subject and link.

## With Resend

1. Create an API key at https://resend.com/api-keys and verify a sending domain at
   https://resend.com/domains (or use the test sender for your own address only).
2. Set on the API: `RESEND_API_KEY=re_…` and `EMAIL_FROM="Baseline <no-reply@your-domain>"`.
3. Restart. The boot log says `Email transport: resend (from …)`.
4. Invite yourself. The screen says the email was sent; the inbox has the invitation; the log has
   the provider message id.

## Verify

```sh
npm test -w apps/api          # email module unit + contract tests, invites and reset specs
npm run schema:check          # schema.graphql includes emailSent on both results
npm run codegen -w apps/web && npm test -w apps/web -- --run
```
