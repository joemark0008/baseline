import { inviteEmail, passwordResetEmail } from './email.templates.js'

const expiresAt = new Date('2026-12-03T10:00:00Z')

describe('inviteEmail', () => {
  const email = inviteEmail({
    productName: 'Baseline',
    inviteUrl: 'https://app.example.com/invite?token=abc&email=a%40b.dev',
    roleName: 'Cashier',
    expiresAt,
  })

  it('names the product and role in the subject', () => {
    expect(email.subject).toBe("You're invited to Baseline as Cashier")
  })

  it('puts the link, role and expiry in both html and text', () => {
    // `&` is escaped inside html attributes, as HTML requires; the text alternative is raw.
    expect(email.html).toContain('https://app.example.com/invite?token=abc&amp;email=a%40b.dev')
    expect(email.text).toContain('https://app.example.com/invite?token=abc&email=a%40b.dev')
    for (const body of [email.html, email.text]) {
      expect(body).toContain('Cashier')
      expect(body).toContain('3 Dec 2026')
    }
  })

  it('keeps the text alternative free of markup and escapes html', () => {
    expect(email.text).not.toMatch(/<[a-z]/i)
    const hostile = inviteEmail({
      productName: 'Baseline',
      inviteUrl: 'https://app.example.com/invite?token=1',
      roleName: '<script>alert(1)</script>',
      expiresAt,
    })
    expect(hostile.html).not.toContain('<script>')
    expect(hostile.html).toContain('&lt;script&gt;')
  })
})

describe('passwordResetEmail', () => {
  const email = passwordResetEmail({
    productName: 'Baseline',
    name: 'Bo',
    resetUrl: 'https://app.example.com/reset-password?token=xyz',
    expiresAt,
  })

  it('addresses the person and explains the one-time link', () => {
    expect(email.subject).toBe('Reset your Baseline password')
    expect(email.text).toContain('Bo')
    expect(email.text).toContain('https://app.example.com/reset-password?token=xyz')
    expect(email.text).toMatch(/once/i)
    expect(email.html).toContain('3 Dec 2026')
  })
})
