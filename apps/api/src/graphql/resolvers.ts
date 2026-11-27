import { AccessResolver } from '../feature/access/access.resolver.js'
import { InvitesResolver } from '../feature/invites/invites.resolver.js'
import { PasswordResetResolver } from '../feature/password-reset/password-reset.resolver.js'
import { DeliverablesResolver } from '../feature/projects/deliverables.resolver.js'
import { PhasesResolver } from '../feature/projects/phases.resolver.js'
import { ProjectsResolver } from '../feature/projects/projects.resolver.js'
import { TasksResolver } from '../feature/projects/tasks.resolver.js'
import { TemplateResolver } from '../feature/projects/template.resolver.js'
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
  TemplateResolver,
  ProjectsResolver,
  PhasesResolver,
  TasksResolver,
  DeliverablesResolver,
]
