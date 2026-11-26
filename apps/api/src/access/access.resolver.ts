import { Query, Resolver } from '@nestjs/graphql'
import { Session } from '@thallesp/nestjs-better-auth'
import type { AuthSession } from '../auth/auth.config.js'
import { AccessService } from './access.service.js'
import { ACTIONS, type PermissionAction } from './actions.js'
import { ACCESS_AREAS } from './areas.js'
import { requiredActions } from './capabilities.js'
import { MyAccess } from './entities/my-access.entity.js'
import { PermissionArea } from './entities/permission-area.entity.js'
import { RequirePermission } from './require-permission.decorator.js'

@Resolver()
export class AccessResolver {
  constructor(private readonly access: AccessService) {}

  @Query(() => MyAccess, { description: "The signed-in person's role and permissions." })
  async myAccess(@Session() session: AuthSession): Promise<MyAccess> {
    const { role, permissions } = await this.access.permissionsFor(session.user.id)
    return { role, permissions: [...permissions] }
  }

  @Query(() => [PermissionArea], { description: 'The roles grid rows. Needs roles:view.' })
  @RequirePermission('roles', 'view')
  permissionAreas(): PermissionArea[] {
    return ACCESS_AREAS.map((area) => ({
      key: area.key,
      name: area.name,
      actions: ACTIONS.flatMap((action) => {
        const description = (area.actions as Partial<Record<string, string>>)[action]
        if (!description) return []
        const requires = requiredActions(area, action) as PermissionAction[]
        return [{ action: action as PermissionAction, description, requires }]
      }),
    }))
  }
}
