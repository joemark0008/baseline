import { Inject, Injectable } from '@nestjs/common'
import type { Auth } from './auth.config.js'

/** The part of Better Auth's server context this port uses. */
export type AuthContextLike = Pick<Awaited<Auth['$context']>, 'password' | 'internalAdapter'>

export const AUTH_CONTEXT = Symbol('AUTH_CONTEXT')

const CREDENTIAL = 'credential'

/**
 * Password and session mechanics, done by Better Auth itself (feature 002, research R2): its
 * configured hasher, its account writes and its session store, including any session cache.
 * Services decide the rules; this port only carries them out.
 */
@Injectable()
export class AuthPasswords {
  constructor(
    @Inject(AUTH_CONTEXT) private readonly context: AuthContextLike | Promise<AuthContextLike>,
  ) {}

  async hasPassword(userId: string): Promise<boolean> {
    return (await this.credentialAccount(userId))?.password != null
  }

  /** Hashes and stores the password, creating the credential account if the person has none. */
  async setPassword(userId: string, password: string): Promise<void> {
    const ctx = await this.context
    const hash = await ctx.password.hash(password)
    if (await this.credentialAccount(userId)) {
      await ctx.internalAdapter.updatePassword(userId, hash)
    } else {
      await ctx.internalAdapter.linkAccount({
        userId,
        accountId: userId,
        providerId: CREDENTIAL,
        password: hash,
      })
    }
  }

  async verify(userId: string, password: string): Promise<boolean> {
    const hash = (await this.credentialAccount(userId))?.password
    if (!hash) return false
    return (await this.context).password.verify({ hash, password })
  }

  async signOutEverywhere(userId: string): Promise<void> {
    await (await this.context).internalAdapter.deleteUserSessions(userId)
  }

  async signOutOthers(userId: string, keepToken: string): Promise<void> {
    const ctx = await this.context
    const sessions = await ctx.internalAdapter.listSessions(userId)
    const others = sessions.map((s) => s.token).filter((t) => t !== keepToken)
    if (others.length) await ctx.internalAdapter.deleteSessions(others)
  }

  private async credentialAccount(userId: string) {
    const accounts = await (await this.context).internalAdapter.findAccounts(userId)
    return accounts.find((a) => a.providerId === CREDENTIAL)
  }
}
