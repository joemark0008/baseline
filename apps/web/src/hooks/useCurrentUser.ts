import { getSession, useSession, type SessionUser } from '../lib/auth-client'

export interface CurrentUser {
  user: SessionUser
}

function toCurrentUser(user: SessionUser): CurrentUser {
  return { user }
}

export function useCurrentUser(): { current: CurrentUser | null; isPending: boolean } {
  const { data, isPending } = useSession()
  return { current: data ? toCurrentUser(data.user) : null, isPending }
}

/** For loaders and beforeLoad. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession()
  return session ? toCurrentUser(session.user) : null
}
