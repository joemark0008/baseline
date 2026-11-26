import { ForbiddenException, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AccessService } from './access.service.js'
import { PermissionGuard } from './permission.guard.js'

function contextFor(session: unknown): ExecutionContext {
  const request = { session }
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
    getArgs: () => [undefined, undefined, { req: request }, undefined],
  } as unknown as ExecutionContext
}

describe('PermissionGuard', () => {
  const permissionsFor = vi.fn()
  const reflector = new Reflector()
  const guard = new PermissionGuard(reflector, { permissionsFor } as unknown as AccessService)
  const require = (area: string, action: string) =>
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ area, action })

  beforeEach(() => vi.restoreAllMocks())

  it('allows when the role grants the permission', async () => {
    require('users', 'view')
    permissionsFor.mockResolvedValue({ permissions: new Set(['users:view']) })
    await expect(guard.canActivate(contextFor({ user: { id: 'u1' } }))).resolves.toBe(true)
    expect(permissionsFor).toHaveBeenCalledWith('u1')
  })

  it('refuses with a clear message when the permission is missing', async () => {
    require('invites', 'add')
    permissionsFor.mockResolvedValue({ permissions: new Set(['users:view']) })
    const err = await guard.canActivate(contextFor({ user: { id: 'u1' } })).catch((e) => e)
    expect(err).toBeInstanceOf(ForbiddenException)
    expect((err as Error).message).toBe("You don't have access to add invites.")
  })

  it('refuses when there is no session', async () => {
    require('users', 'view')
    await expect(guard.canActivate(contextFor(null))).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('reads permissions again on every request', async () => {
    require('users', 'view')
    permissionsFor.mockResolvedValueOnce({ permissions: new Set(['users:view']) })
    permissionsFor.mockResolvedValueOnce({ permissions: new Set() })
    await expect(guard.canActivate(contextFor({ user: { id: 'u1' } }))).resolves.toBe(true)
    await expect(guard.canActivate(contextFor({ user: { id: 'u1' } }))).rejects.toThrow()
  })
})
