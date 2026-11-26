import { Test, type TestingModule } from '@nestjs/testing'
import { SetupResolver } from './setup.resolver.js'
import { SetupService } from './setup.service.js'

describe('SetupResolver', () => {
  let resolver: SetupResolver
  const setupService = {
    status: vi.fn().mockResolvedValue({ setupComplete: false, minPasswordLength: 8 }),
    completeSetup: vi.fn().mockResolvedValue({ email: 'admin@x.dev' }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SetupResolver, { provide: SetupService, useValue: setupService }],
    }).compile()
    resolver = module.get(SetupResolver)
  })

  it('setupStatus delegates to the service', async () => {
    expect(await resolver.setupStatus()).toEqual({ setupComplete: false, minPasswordLength: 8 })
  })

  it('completeSetup passes the input through unchanged', async () => {
    const input = { token: 't', name: 'Ada', email: 'admin@x.dev', password: 'longenough' }
    expect(await resolver.completeSetup(input)).toEqual({ email: 'admin@x.dev' })
    expect(setupService.completeSetup).toHaveBeenCalledWith(input)
  })
})
