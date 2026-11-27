import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../../prisma/prisma.service.js'
import { PhaseStatus } from './entities/enums.js'
import { PhasesService } from './phases.service.js'
import { ProjectAccessService } from './project-access.service.js'

interface Row {
  id: string
  projectId: string
  name: string
  description: string | null
  order: number
  ownerId: string | null
  startDate: Date | null
  endDate: Date | null
  status: string
}

function fakeDb() {
  let seq = 0
  const phases: Row[] = [
    {
      id: 'ph1',
      projectId: 'p1',
      name: 'Kickoff',
      description: null,
      order: 1,
      ownerId: null,
      startDate: null,
      endDate: null,
      status: 'UPCOMING',
    },
    {
      id: 'ph2',
      projectId: 'p1',
      name: 'Training',
      description: null,
      order: 2,
      ownerId: null,
      startDate: null,
      endDate: null,
      status: 'UPCOMING',
    },
  ]
  const activity: Array<{ kind: string; summary: string }> = []
  const taskCounts: Record<string, number> = {}
  const withRel = (r: Row) => ({ ...r, owner: null, tasks: [], deliverables: [] })
  const client = {
    projectPhase: {
      count: async ({ where }: { where: { projectId: string } }) =>
        phases.filter((p) => p.projectId === where.projectId).length,
      findUnique: async ({ where }: { where: { id: string } }) =>
        phases.find((p) => p.id === where.id) ?? null,
      findMany: async ({ where }: { where: { projectId: string } }) =>
        phases
          .filter((p) => p.projectId === where.projectId)
          .sort((a, b) => a.order - b.order)
          .map(withRel),
      create: async ({
        data,
      }: {
        data: Omit<Row, 'id' | 'ownerId' | 'startDate' | 'endDate' | 'status'>
      }) => {
        const row: Row = {
          id: `ph${++seq + 2}`,
          ownerId: null,
          startDate: null,
          endDate: null,
          status: 'UPCOMING',
          ...data,
        }
        phases.push(row)
        return withRel(row)
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = phases.find((p) => p.id === where.id)!
        Object.assign(row, data)
        return withRel(row)
      },
      delete: async ({ where }: { where: { id: string } }) => {
        phases.splice(
          phases.findIndex((p) => p.id === where.id),
          1,
        )
      },
    },
    projectTask: {
      count: async ({ where }: { where: { phaseId: string } }) => taskCounts[where.phaseId] ?? 0,
    },
    projectDeliverable: { count: async () => 0 },
    projectActivity: {
      create: async ({ data }: { data: { kind: string; summary: string } }) => activity.push(data),
    },
  }
  return {
    phases,
    activity,
    taskCounts,
    client: {
      ...client,
      $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) => fn(client),
    },
  }
}

describe('PhasesService', () => {
  let db: ReturnType<typeof fakeDb>
  let svc: PhasesService
  const access = {
    assertManager: vi.fn(),
    assertMember: vi.fn(),
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    access.assertManager.mockResolvedValue('MANAGER')
    access.assertMember.mockResolvedValue('MEMBER')
    db = fakeDb()
    const module = await Test.createTestingModule({
      providers: [
        PhasesService,
        { provide: PrismaService, useValue: { client: db.client } },
        { provide: ProjectAccessService, useValue: access },
      ],
    }).compile()
    svc = module.get(PhasesService)
  })

  it('adds a phase at the end for a Manager and records it', async () => {
    const phase = await svc.add({ projectId: 'p1', name: ' Go-Live ' }, 'ada')
    expect(phase.order).toBe(3)
    expect(phase.name).toBe('Go-Live')
    expect(access.assertManager).toHaveBeenCalledWith('p1', 'ada')
    expect(db.activity.at(-1)).toMatchObject({
      kind: 'PHASE_ADDED',
      summary: 'added phase Go-Live',
    })
  })

  it('refuses a Member', async () => {
    access.assertManager.mockRejectedValue(new ForbiddenException())
    await expect(svc.add({ projectId: 'p1', name: 'x' }, 'bo')).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('updates owner, dates and status, keeping end after start', async () => {
    const phase = await svc.update(
      {
        id: 'ph1',
        ownerId: 'bo',
        startDate: '2026-06-01',
        endDate: '2026-06-15',
        status: PhaseStatus.IN_PROGRESS,
      },
      'ada',
    )
    expect(phase.startDate).toBe('2026-06-01')
    expect(phase.endDate).toBe('2026-06-15')
    expect(phase.status).toBe('IN_PROGRESS')
    expect(access.assertMember).toHaveBeenCalledWith('p1', 'bo')
    await expect(svc.update({ id: 'ph1', endDate: '2026-05-01' }, 'ada')).rejects.toThrow(
      'End date must not be before start date',
    )
  })

  it('reorders by id list and renumbers from 1', async () => {
    const list = await svc.reorder('p1', ['ph2', 'ph1'], 'ada')
    expect(list.map((p) => [p.id, p.order])).toEqual([
      ['ph2', 1],
      ['ph1', 2],
    ])
    await expect(svc.reorder('p1', ['ph1'], 'ada')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('removes an empty phase and refuses one that still has tasks', async () => {
    db.taskCounts.ph1 = 2
    await expect(svc.remove('ph1', 'ada')).rejects.toThrow('Move its tasks and deliverables first')
    expect(await svc.remove('ph2', 'ada')).toBe(true)
    expect(db.phases.map((p) => p.id)).toEqual(['ph1'])
  })
})
