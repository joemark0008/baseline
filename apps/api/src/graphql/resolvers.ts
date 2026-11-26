import { AccessResolver } from '../access/access.resolver.js'
import { InvitesResolver } from '../invites/invites.resolver.js'
import { PasswordResetResolver } from '../password-reset/password-reset.resolver.js'
import { RolesResolver } from '../roles/roles.resolver.js'
import { SetupResolver } from '../setup/setup.resolver.js'
import { UsersResolver } from '../users/users.resolver.js'

/** Every resolver class, used by `schema.generate.ts`. Add new feature resolvers here. */
export const API_RESOLVERS = [
  AccessResolver,
  UsersResolver,
  InvitesResolver,
  RolesResolver,
  SetupResolver,
  PasswordResetResolver,
]
