import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, username } from 'better-auth/plugins'
import { loadEnv } from '../config/env.js'
import { prisma } from '../prisma/prisma.client.js'
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './password.js'

const env = loadEnv()

/** Attempts per window for the sign-in group (feature 003); Better Auth takes seconds. */
const signInRule = { window: env.rateLimit.signIn.windowSeconds, max: env.rateLimit.signIn.max }

/** The single Better Auth instance (constitution: Technology Stack › Authentication › Wiring). */
export const auth = betterAuth({
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  basePath: '/api/auth',
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  trustedOrigins: env.webOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    maxPasswordLength: MAX_PASSWORD_LENGTH,
  },
  socialProviders: env.google ? { google: env.google } : {},
  plugins: [
    admin({ bannedUserMessage: 'Your account is deactivated. Ask an admin to reactivate it.' }),
    username(),
  ],
  // `hooks` / `databaseHooks` must exist so the Nest integration can attach @Hook providers.
  hooks: {},
  databaseHooks: {},
  // Better Auth's own routes never reach Nest guards, so the sign-in group is enforced here.
  // Keys are per address and per path; `/sign-in/*` and `/sign-up/*` get the sign-in rule,
  // every other auth route the general rule. Always on, so dev and tests behave like production.
  rateLimit: {
    enabled: true,
    storage: 'memory',
    window: env.rateLimit.general.windowSeconds,
    max: env.rateLimit.general.max,
    customRules: { '/sign-in/*': signInRule, '/sign-up/*': signInRule },
  },
  advanced: {
    // Same header list as the API guard; a multi-address x-forwarded-for is ignored by the library.
    ipAddress: { ipAddressHeaders: env.clientIpHeaders },
    ...(env.cookieDomain
      ? { crossSubDomainCookies: { enabled: true, domain: env.cookieDomain } }
      : {}),
  },
})

export type Auth = typeof auth
export type AuthSession = typeof auth.$Infer.Session
