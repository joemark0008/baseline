import { Test, type TestingModule } from '@nestjs/testing'
import { AccessService } from '../access/access.service.js'
import { APP_ENV } from '../config/env.js'
import { buildInviteUrl, InvitesResolver } from './invites.resolver.js'
import { InvitesService } from './invites.service.js'

describe('InvitesResolver', () => {
  let resolver: InvitesResolver
  const invitesService = {
    validateToken: vi.fn(),
    inviteUser: vi.fn(),
    pendingInvites: vi.fn(),
    revokeInvite: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesResolver,
        { provide: InvitesService, useValue: invitesService },
        { provide: AccessService, useValue: {} },
        { provide: APP_ENV, useValue: { webOrigins: ['https://app.example.com'] } },
      ],
    }).compile()

    resolver = module.get<InvitesResolver>(InvitesResolver)
  })

  it('delegates token validation to the service', async () => {
    invitesService.validateToken.mockResolvedValue({ valid: false, email: null, role: null })
    expect(await resolver.validateInviteToken('t')).toEqual({
      valid: false,
      email: null,
      role: null,
    })
    expect(invitesService.validateToken).toHaveBeenCalledWith('t')
  })
})

describe('InvitesResolver invite management', () => {
  let resolver: InvitesResolver
  const invitesService = { inviteUser: vi.fn(), pendingInvites: vi.fn(), revokeInvite: vi.fn() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesResolver,
        { provide: InvitesService, useValue: invitesService },
        { provide: AccessService, useValue: {} },
        { provide: APP_ENV, useValue: { webOrigins: ['https://app.example.com'] } },
      ],
    }).compile()
    resolver = module.get(InvitesResolver)
  })

  it('invites into the chosen role, passing the deprecated role through', async () => {
    invitesService.inviteUser.mockResolvedValue({ invite: { email: 'a@b.dev' }, token: 't' })
    const result = await resolver.inviteUser({ email: 'a@b.dev', roleId: 'r1', role: null }, {
      user: { id: 'u1', email: 'admin@b.dev' },
    } as never)
    expect(invitesService.inviteUser).toHaveBeenCalledWith({
      email: 'a@b.dev',
      roleId: 'r1',
      legacyRole: null,
      invitedById: 'u1',
    })
    expect(result.inviteUrl).toContain('/invite?token=t')
  })

  it('lists and revokes pending invites', async () => {
    await resolver.pendingInvites({ page: 1 })
    expect(invitesService.pendingInvites).toHaveBeenCalledWith({ page: 1 })
    await resolver.revokeInvite('i1')
    expect(invitesService.revokeInvite).toHaveBeenCalledWith('i1')
  })
})

describe('buildInviteUrl', () => {
  it('encodes token and email as query params on the web origin', () => {
    expect(buildInviteUrl('https://app.example.com', 'a+b/c', 'x@y.z')).toBe(
      'https://app.example.com/invite?token=a%2Bb%2Fc&email=x%40y.z',
    )
  })
})
