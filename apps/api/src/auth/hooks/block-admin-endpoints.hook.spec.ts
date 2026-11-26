import type { AuthHookContext } from '@thallesp/nestjs-better-auth'
import { BLOCKED_HTTP_PATHS, BlockAdminEndpointsHook } from './block-admin-endpoints.hook.js'

const ctx = (path: string, overHttp: boolean) =>
  ({ path, request: overHttp ? new Request('http://x') : undefined }) as unknown as AuthHookContext

describe('BlockAdminEndpointsHook', () => {
  const hook = new BlockAdminEndpointsHook()

  it.each([
    '/admin/set-role',
    '/admin/ban-user',
    '/admin/unban-user',
    '/admin/remove-user',
    '/admin/update-user',
    '/admin/create-user',
    '/admin/set-user-password',
    '/change-password',
    '/set-password',
    '/request-password-reset',
    '/reset-password',
    '/reset-password/:token',
  ])('rejects %s over HTTP', async (path) => {
    expect(BLOCKED_HTTP_PATHS.has(path)).toBe(true)
    await expect(hook.block(ctx(path, true))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('lets server-side calls through (setup wizard uses auth.api.createUser)', async () => {
    await expect(hook.block(ctx('/admin/create-user', false))).resolves.toBeUndefined()
  })

  it('ignores every other endpoint', async () => {
    await expect(hook.block(ctx('/sign-in/email', true))).resolves.toBeUndefined()
    await expect(hook.block(ctx('/admin/list-users', true))).resolves.toBeUndefined()
  })
})
