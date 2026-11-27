import { Test } from '@nestjs/testing'
import type { AuthSession } from '../../auth/auth.config.js'
import { AccessService } from '../access/access.service.js'
import { TaskStatus } from './entities/enums.js'
import { TasksResolver } from './tasks.resolver.js'
import { TasksService } from './tasks.service.js'

/** The resolver forwards arguments and the session user; the rules live in the service. */
describe('TasksResolver', () => {
  const tasks = { move: vi.fn(), list: vi.fn() }
  const session = { user: { id: 'ada' } } as unknown as AuthSession
  let resolver: TasksResolver

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        TasksResolver,
        { provide: TasksService, useValue: tasks },
        { provide: AccessService, useValue: {} },
      ],
    }).compile()
    resolver = module.get(TasksResolver)
  })

  it('forwards a move with the caller id (feature 010)', async () => {
    tasks.move.mockResolvedValue({ id: 't1' })
    const input = { id: 't1', status: TaskStatus.IN_PROGRESS, afterTaskId: 't0' }
    await expect(resolver.moveProjectTask(input, session)).resolves.toEqual({ id: 't1' })
    expect(tasks.move).toHaveBeenCalledWith(input, 'ada')
  })

  it('forwards the list filter including the sort', async () => {
    tasks.list.mockResolvedValue([])
    const filter = { projectId: 'p1', sort: 'DUE_DATE' as never }
    await resolver.projectTasks(filter, session)
    expect(tasks.list).toHaveBeenCalledWith(filter, 'ada')
  })
})
