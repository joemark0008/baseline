import { Test } from '@nestjs/testing'
import { AccessResolver } from './access.resolver.js'
import { AccessService } from './access.service.js'
import { PermissionAction } from './actions.js'

describe('AccessResolver', () => {
  const access = { permissionsFor: vi.fn() }
  let resolver: AccessResolver

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AccessResolver, { provide: AccessService, useValue: access }],
    }).compile()
    resolver = module.get(AccessResolver)
  })

  it("returns the signed-in person's role and permission strings", async () => {
    const role = { id: 'r1', name: 'Cashier', kind: 'CUSTOM' }
    access.permissionsFor.mockResolvedValue({ role, permissions: new Set(['users:view']) })
    expect(await resolver.myAccess({ user: { id: 'u1' } } as never)).toEqual({
      role,
      permissions: ['users:view'],
    })
    expect(access.permissionsFor).toHaveBeenCalledWith('u1')
  })

  it('lists every area with only the actions it offers', () => {
    const users = resolver.permissionAreas().find((a) => a.key === 'users')
    expect(users?.name).toBe('Users')
    expect(users?.actions.map((a) => a.action)).toEqual([
      PermissionAction.VIEW,
      PermissionAction.EDIT,
      PermissionAction.DELETE,
    ])
    expect(users?.actions[0].description).toBe('See the user list')
    expect(users?.actions[0].requires).toEqual([])
    expect(users?.actions[1].requires).toEqual([PermissionAction.VIEW])
  })
})
