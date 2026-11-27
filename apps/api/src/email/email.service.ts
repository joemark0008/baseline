import { Inject, Injectable, Logger } from '@nestjs/common'
import { APP_ENV, type AppEnv } from '../config/env.js'
import {
  inviteEmail,
  mentionEmail,
  passwordResetEmail,
  projectInviteEmail,
  taskAssignedEmail,
  type RenderedEmail,
} from './email.templates.js'
import { EMAIL_TRANSPORT, type EmailTransport } from './email.transport.js'

/** Shown in subjects and bodies. */
export const PRODUCT_NAME = 'baseline'

/**
 * Sends the application's emails (feature 008). Never throws and never fails the caller: the
 * result says whether the provider accepted the message, and every outcome is logged.
 */
@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_TRANSPORT) private readonly transport: EmailTransport,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  sendInvite(input: {
    to: string
    inviteId: string
    inviteUrl: string
    roleName: string
    expiresAt: Date
  }): Promise<boolean> {
    return this.deliver(
      'invite',
      input.to,
      `invite/${input.inviteId}`,
      inviteEmail({ productName: PRODUCT_NAME, ...input }),
    )
  }

  sendPasswordReset(input: {
    to: string
    userId: string
    name: string
    resetUrl: string
    expiresAt: Date
  }): Promise<boolean> {
    return this.deliver(
      'password reset',
      input.to,
      `password-reset/${input.userId}/${input.expiresAt.getTime()}`,
      passwordResetEmail({ productName: PRODUCT_NAME, ...input }),
    )
  }

  sendProjectInvite(input: {
    to: string
    inviteId: string
    projectName: string
    hospitalName: string
    projectRole: string
    inviteUrl: string
    expiresAt: Date
  }): Promise<boolean> {
    return this.deliver(
      'project invite',
      input.to,
      `project-invite/${input.inviteId}`,
      projectInviteEmail({ productName: PRODUCT_NAME, ...input }),
    )
  }

  sendTaskAssigned(input: {
    to: string
    taskId: string
    projectName: string
    taskTitle: string
    assignedBy: string
    dueDate: string | null
    taskUrl: string
  }): Promise<boolean> {
    return this.deliver(
      'task assignment',
      input.to,
      `task-assigned/${input.taskId}/${input.to}/${Date.now()}`,
      taskAssignedEmail({ productName: PRODUCT_NAME, ...input }),
    )
  }

  sendMention(input: {
    to: string
    commentId: string
    projectName: string
    taskTitle: string
    author: string
    excerpt: string
    taskUrl: string
  }): Promise<boolean> {
    return this.deliver(
      'mention',
      input.to,
      `mention/${input.commentId}/${input.to}`,
      mentionEmail({ productName: PRODUCT_NAME, ...input }),
    )
  }

  private async deliver(
    kind: string,
    to: string,
    idempotencyKey: string,
    rendered: RenderedEmail,
  ): Promise<boolean> {
    try {
      const result = await this.transport.send({
        to,
        ...rendered,
        ...(this.env.email.replyTo ? { replyTo: this.env.email.replyTo } : {}),
        idempotencyKey,
      })
      if (result.ok) {
        Logger.log(`Sent ${kind} email to ${to} via ${this.transport.name} (${result.id})`, 'Email')
        return true
      }
      Logger.error(`Could not send ${kind} email to ${to}: ${result.error}`, 'Email')
      return false
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      Logger.error(`Could not send ${kind} email to ${to}: ${reason}`, 'Email')
      return false
    }
  }
}
