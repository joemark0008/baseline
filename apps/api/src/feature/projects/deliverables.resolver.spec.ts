import { Test } from '@nestjs/testing'
import type { AuthSession } from '../../auth/auth.config.js'
import { AccessService } from '../access/access.service.js'
import { DeliverablesResolver } from './deliverables.resolver.js'
import { DeliverablesService } from './deliverables.service.js'

describe('DeliverablesResolver', () => {
  const deliverables = { move: vi.fn() }
  const session = { user: { id: 'ada' } } as unknown as AuthSession
  let resolver: DeliverablesResolver

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        DeliverablesResolver,
        { provide: DeliverablesService, useValue: deliverables },
        { provide: AccessService, useValue: {} },
      ],
    }).compile()
    resolver = module.get(DeliverablesResolver)
  })

  it('forwards a move with the caller id (feature 010)', async () => {
    deliverables.move.mockResolvedValue({ id: 'd1' })
    const input = { id: 'd1', phaseId: 'ph2', afterId: 'd0' }
    await expect(resolver.moveProjectDeliverable(input, session)).resolves.toEqual({ id: 'd1' })
    expect(deliverables.move).toHaveBeenCalledWith(input, 'ada')
  })
})
