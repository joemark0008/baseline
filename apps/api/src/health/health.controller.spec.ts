import { Test, type TestingModule } from '@nestjs/testing'
import { isExemptFromRateLimit } from '../rate-limit/rate-limit.decorators.js'
import { HealthController } from './health.controller.js'

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile()

    controller = module.get<HealthController>(HealthController)
  })

  it('reports ok', () => {
    expect(controller.check()).toEqual({ status: 'ok' })
  })

  it('is exempt from every rate-limit group', () => {
    expect(isExemptFromRateLimit(HealthController)).toBe(true)
  })
})
