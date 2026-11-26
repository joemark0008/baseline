import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GqlExecutionContext } from '@nestjs/graphql'
import { permissionKey } from './access-policy.js'
import { AccessService } from './access.service.js'
import { findArea } from './areas.js'
import { REQUIRED_PERMISSION, type RequiredPermission } from './require-permission.decorator.js'

interface RequestWithSession {
  session?: { user?: { id?: string } } | null
}

/** Enforces `@RequirePermission`. Permissions are read from the database on every request. */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      REQUIRED_PERMISSION,
      [context.getHandler(), context.getClass()],
    )
    if (!required) return true
    const denied = new ForbiddenException(
      `You don't have access to ${required.action} ${(findArea(required.area)?.name ?? required.area).toLowerCase()}.`,
    )
    const userId = this.requestOf(context).session?.user?.id
    if (!userId) throw denied
    const { permissions } = await this.access.permissionsFor(userId)
    if (!permissions.has(permissionKey(required.area, required.action))) throw denied
    return true
  }

  private requestOf(context: ExecutionContext): RequestWithSession {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{ req: RequestWithSession }>().req
    }
    return context.switchToHttp().getRequest<RequestWithSession>()
  }
}
