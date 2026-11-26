import { createAuthClient } from 'better-auth/react'
import { adminClient, usernameClient } from 'better-auth/client/plugins'
import { API_URL } from './env'

/** The single Better Auth client. Never construct a second one (two session caches disagree). */
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/api/auth',
  plugins: [adminClient(), usernameClient()],
})

export const { useSession, signIn, signUp, signOut } = authClient

export type SessionData = NonNullable<Awaited<ReturnType<typeof authClient.getSession>>['data']>
export type SessionUser = SessionData['user']

/** For loaders and `beforeLoad`, where hooks are not available. */
export async function getSession(): Promise<SessionData | null> {
  const { data } = await authClient.getSession()
  return data ?? null
}
