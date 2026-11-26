import type { Access } from '../lib/access'
import type { SessionData } from '../lib/auth-client'

/** Router context: how routes read the session and setup state in `beforeLoad` (injected in main.tsx). */
export interface RouterAuthContext {
  getSession: () => Promise<SessionData | null>
  /** False only while first-run setup is still open. */
  getSetupComplete: () => Promise<boolean>
  /** The signed-in person's role and permissions, read fresh each time. */
  getAccess: () => Promise<Access | null>
}
