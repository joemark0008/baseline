import { AccessResolver } from '../feature/access/access.resolver.js'
import { InvitesResolver } from '../feature/invites/invites.resolver.js'
import { PasswordResetResolver } from '../feature/password-reset/password-reset.resolver.js'
import { RolesResolver } from '../feature/roles/roles.resolver.js'
import { SetupResolver } from '../feature/setup/setup.resolver.js'
import { UsersResolver } from '../feature/users/users.resolver.js'

/** Every resolver class, used by `schema.generate.ts`. Add new feature resolvers here. */
export const API_RESOLVERS = [
  AccessResolver,
  UsersResolver,
  InvitesResolver,
  RolesResolver,
  SetupResolver,
  PasswordResetResolver,
]
