import { Test } from '@nestjs/testing'
import { AccessService } from '../access/access.service.js'
import { REQUIRED_PERMISSION } from '../access/require-permission.decorator.js'
import { RolesResolver } from './roles.resolver.js'
import { UsersService } from '../users/users.service.js'
import { RolesService } from './roles.service.js'

const counts = { memberCount: 0, pendingInviteCount: 0 }
const ADMIN = { id: 'role_admin', name: 'Admin', kind: 'ADMIN', ...counts }
const MEMBER = { id: 'role_member', name: 'Member', kind: 'MEMBER', ...counts }
const CASHIER = { id: 'r1', name: 'Cashier', kind: 'CUSTOM', ...counts }
const session = { user: { id: 'u1' } } as never
const req = { session: { user: { id: 'u1' } } }

describe('RolesResolver', () => {
  const roles = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    accessChanges: vi.fn(),
  }
  const access = { permissionsFor: vi.fn(), forRequest: vi.fn(), setUserRole: vi.fn() }
  const users = { findById: vi.fn() }
  let resolver: RolesResolver
  const callerIs = (kind: string, ...perms: string[]) =>
    access.forRequest.mockResolvedValue({ role: { kind }, permissions: new Set(perms) })

  beforeEach(async () => {
    vi.clearAllMocks()
    roles.list.mockResolvedValue([ADMIN, MEMBER, CASHIER])
    const module = await Test.createTestingModule({
      providers: [
        RolesResolver,
        { provide: RolesService, useValue: roles },
        { provide: AccessService, useValue: access },
        { provide: UsersService, useValue: users },
      ],
    }).compile()
    resolver = module.get(RolesResolver)
  })

  it('tells the caller what they may do with each role', async () => {
    callerIs('CUSTOM', 'roles:edit')
    expect(await resolver.can(CASHIER as never, req)).toMatchObject({
      assign: true,
      rename: true,
      delete: false,
    })
    expect((await resolver.can(ADMIN as never, req)).assign).toBe(false)
  })

  it('offers only roles the caller may assign, default (Member) first', async () => {
    callerIs('CUSTOM')
    const names = (list: Array<{ name: string }>) => list.map((r) => r.name)
    expect(names(await resolver.inviteRoles(req))).toEqual(['Member', 'Cashier'])
    expect(names(await resolver.assignableRoles(req))).toEqual(['Member', 'Cashier'])
    callerIs('ADMIN')
    expect(names(await resolver.inviteRoles(req))).toEqual(['Member', 'Admin', 'Cashier'])
  })

  it('passes the caller as the actor on every change', async () => {
    callerIs('ADMIN')
    await resolver.createRole({ name: 'X', grants: [] }, session)
    expect(roles.create).toHaveBeenCalledWith({ name: 'X', grants: [] }, 'u1')
    await resolver.updateRole({ id: 'r1', name: 'Y' }, session)
    expect(roles.update).toHaveBeenCalledWith({ id: 'r1', name: 'Y' }, 'u1')
    await resolver.deleteRole('r1', session)
    expect(roles.delete).toHaveBeenCalledWith('r1', 'u1')
  })

  it('protects each operation with a roles permission', () => {
    const required = (name: keyof RolesResolver) =>
      Reflect.getMetadata(REQUIRED_PERMISSION, RolesResolver.prototype[name])
    expect(required('roles')).toEqual({ area: 'roles', action: 'view' })
    expect(required('accessChanges')).toEqual({ area: 'roles', action: 'view' })
    expect(required('inviteRoles')).toEqual({ area: 'invites', action: 'add' })
    expect(required('assignableRoles')).toEqual({ area: 'roles', action: 'edit' })
    expect(required('createRole')).toEqual({ area: 'roles', action: 'add' })
    expect(required('updateRole')).toEqual({ area: 'roles', action: 'edit' })
    expect(required('deleteRole')).toEqual({ area: 'roles', action: 'delete' })
    expect(required('setUserRole')).toEqual({ area: 'roles', action: 'edit' })
  })

  it('moves a person into a role and returns them', async () => {
    users.findById.mockResolvedValue({ id: 'u2' })
    expect(await resolver.setUserRole({ userId: 'u2', roleId: 'r1' }, session)).toEqual({
      id: 'u2',
    })
    expect(access.setUserRole).toHaveBeenCalledWith('u1', 'u2', 'r1')
  })
})
