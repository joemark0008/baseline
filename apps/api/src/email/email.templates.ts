/** Pure renderers for the emails this application sends. Plain HTML with a text alternative. */
export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** e.g. "3 Dec 2026, 10:00 UTC": unambiguous for a hospital and vendor team across time zones. */
export function formatExpiry(date: Date): string {
  const day = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date)
  return `${day}, ${time} UTC`
}

function layout(
  productName: string,
  title: string,
  paragraphs: string[],
  cta: { href: string; label: string },
): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join('')
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;font-size:16px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px">
<p style="margin:0 0 24px;font-weight:600;color:#6b7280">${escapeHtml(productName)}</p>
<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(title)}</h1>
${body}
<p style="margin:24px 0"><a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">${escapeHtml(cta.label)}</a></p>
<p style="margin:0;font-size:14px;color:#6b7280">If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(cta.href)}" style="color:#374151;word-break:break-all">${escapeHtml(cta.href)}</a></p>
</div>
</body>
</html>`
}

export function inviteEmail(input: {
  productName: string
  inviteUrl: string
  roleName: string
  expiresAt: Date
}): RenderedEmail {
  const expiry = formatExpiry(input.expiresAt)
  const subject = `You're invited to ${input.productName} as ${input.roleName}`
  const text = [
    `You have been invited to ${input.productName} as ${input.roleName}.`,
    '',
    `Accept the invitation: ${input.inviteUrl}`,
    '',
    `The link works until ${expiry}. If you did not expect this invitation, ignore this email.`,
  ].join('\n')
  const html = layout(
    input.productName,
    `You're invited as ${input.roleName}`,
    [
      `You have been invited to <strong>${escapeHtml(input.productName)}</strong> as <strong>${escapeHtml(input.roleName)}</strong>.`,
      `The link works until ${escapeHtml(expiry)}. If you did not expect this invitation, ignore this email.`,
    ],
    { href: input.inviteUrl, label: 'Accept invitation' },
  )
  return { subject, html, text }
}

export function passwordResetEmail(input: {
  productName: string
  name: string
  resetUrl: string
  expiresAt: Date
}): RenderedEmail {
  const expiry = formatExpiry(input.expiresAt)
  const subject = `Reset your ${input.productName} password`
  const text = [
    `Hi ${input.name},`,
    '',
    `An administrator created a password reset link for your ${input.productName} account.`,
    `Set a new password: ${input.resetUrl}`,
    '',
    `The link works once, until ${expiry}. If you did not ask for this, ignore this email; your password stays the same.`,
  ].join('\n')
  const html = layout(
    input.productName,
    'Reset your password',
    [
      `Hi ${escapeHtml(input.name)},`,
      `An administrator created a password reset link for your <strong>${escapeHtml(input.productName)}</strong> account.`,
      `The link works once, until ${escapeHtml(expiry)}. If you did not ask for this, ignore this email; your password stays the same.`,
    ],
    { href: input.resetUrl, label: 'Set a new password' },
  )
  return { subject, html, text }
}

export function projectInviteEmail(input: {
  productName: string
  projectName: string
  hospitalName: string
  projectRole: string
  inviteUrl: string
  expiresAt: Date
}): RenderedEmail {
  const expiry = formatExpiry(input.expiresAt)
  const subject = `You're invited to ${input.projectName} on ${input.productName}`
  const text = [
    `You have been invited to join the implementation project "${input.projectName}" (${input.hospitalName}) as ${input.projectRole}.`,
    '',
    `Accept the invitation: ${input.inviteUrl}`,
    '',
    `The link works until ${expiry}. If you did not expect this invitation, ignore this email.`,
  ].join('\n')
  const html = layout(
    input.productName,
    `Join ${input.projectName}`,
    [
      `You have been invited to join the implementation project <strong>${escapeHtml(input.projectName)}</strong> (${escapeHtml(input.hospitalName)}) as <strong>${escapeHtml(input.projectRole)}</strong>.`,
      `The link works until ${escapeHtml(expiry)}. If you did not expect this invitation, ignore this email.`,
    ],
    { href: input.inviteUrl, label: 'Open the invitation' },
  )
  return { subject, html, text }
}

export function taskAssignedEmail(input: {
  productName: string
  projectName: string
  taskTitle: string
  assignedBy: string
  dueDate: string | null
  taskUrl: string
}): RenderedEmail {
  const due = input.dueDate ? `It is due on ${input.dueDate}.` : 'It has no due date yet.'
  const subject = `${input.assignedBy} assigned you "${input.taskTitle}"`
  const text = [
    `${input.assignedBy} assigned you the task "${input.taskTitle}" in ${input.projectName}. ${due}`,
    '',
    `Open the task: ${input.taskUrl}`,
  ].join('\n')
  const html = layout(
    input.productName,
    `You were assigned "${input.taskTitle}"`,
    [
      `<strong>${escapeHtml(input.assignedBy)}</strong> assigned you this task in <strong>${escapeHtml(input.projectName)}</strong>. ${escapeHtml(due)}`,
    ],
    { href: input.taskUrl, label: 'Open the task' },
  )
  return { subject, html, text }
}

export function mentionEmail(input: {
  productName: string
  projectName: string
  taskTitle: string
  author: string
  excerpt: string
  taskUrl: string
}): RenderedEmail {
  const subject = `${input.author} mentioned you on "${input.taskTitle}"`
  const text = [
    `${input.author} mentioned you in a comment on "${input.taskTitle}" (${input.projectName}):`,
    '',
    input.excerpt,
    '',
    `Open the task: ${input.taskUrl}`,
  ].join('\n')
  const html = layout(
    input.productName,
    `${input.author} mentioned you`,
    [
      `On <strong>${escapeHtml(input.taskTitle)}</strong> in <strong>${escapeHtml(input.projectName)}</strong>:`,
      `<em>${escapeHtml(input.excerpt)}</em>`,
    ],
    { href: input.taskUrl, label: 'Open the task' },
  )
  return { subject, html, text }
}
