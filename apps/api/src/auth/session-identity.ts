import type { AuthSession } from './auth.config.js'

/**
 * The identity value resolvers pass to services (constitution Principle V: session identity
 * enters services as a value, never via the auth library).
 */
export interface SessionIdentity {
  userId: string
  email: string
  role: string | null
}

export function toSessionIdentity(session: AuthSession): SessionIdentity {
  return { userId: session.user.id, email: session.user.email, role: session.user.role ?? null }
}
