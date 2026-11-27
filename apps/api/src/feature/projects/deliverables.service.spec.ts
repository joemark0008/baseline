import { ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../../prisma/prisma.service.js'
import { DeliverablesService } from './deliverables.service.js'
import { DeliverableKind, DeliverableStatus, ReviewOutcome } from './entities/enums.js'
import { ProjectAccessService } from './project-access.service.js'

function fakeDb() {
  let seq = 0
  const rows: Array<
    Record<string, unknown> & {
      id: string
      projectId: string
      phaseId: string
      status: string
      reviewerId: string | null
    }
  > = []
  const activity: Array<{ kind: string; summary: string }> = []
  const hydrate = (r: (typeof rows)[number]) => ({ ...r, owner: null, reviewer: null })
  const client = {
    projectPhase: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'ph1' ? { id: 'ph1', projectId: 'p1' } : null,
    },
    projectDeliverable: {
      count: async () => rows.length,
      // A copy, like Prisma: the service compares the pre-update row with the input.
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = rows.find((r) => r.id === where.id)
        return row ? { ...row } : null
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `d${++seq}`,
          links: [],
          status: 'NOT_STARTED',
          reviewOutcome: null,
          reviewNote: null,
          reviewedAt: null,
          dueDate: null,
          ...data,
        } as unknown as (typeof rows)[number]
        rows.push(row)
        return hydrate(row)
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = rows.find((r) => r.id === where.id)!
        Object.assign(row, data)
        return hydrate(row)
      },
      delete: async ({ where }: { where: { id: string } }) => {
        rows.splice(
          rows.findIndex((r) => r.id === where.id),
          1,
        )
      },
    },
    projectActivity: {
      create: async ({ data }: { data: { kind: string; summary: string } }) => activity.push(data),
    },
  }
  return {
    rows,
    activity,
    client: {
      ...client,
      $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) => fn(client),
    },
  }
}

describe('DeliverablesService', () => {
  let db: ReturnType<typeof fakeDb>
  let svc: DeliverablesService
  const access = { assertMember: vi.fn() }

  beforeEach(async () => {
    vi.clearAllMocks()
    access.assertMember.mockResolvedValue('MEMBER')
    db = fakeDb()
    const module = await Test.createTestingModule({
      providers: [
        DeliverablesService,
        { provide: PrismaService, useValue: { client: db.client } },
        { provide: ProjectAccessService, useValue: access },
      ],
    }).compile()
    svc = module.get(DeliverablesService)
  })

  it('adds a deliverable with owner, reviewer, due date and links (FR-016)', async () => {
    const d = await svc.add(
      {
        projectId: 'p1',
        phaseId: 'ph1',
        title: 'Pharmacy item master',
        kind: DeliverableKind.DATA_CATEGORY,
        reviewerId: 'bo',
        dueDate: '2026-11-28',
      },
      'ada',
    )
    expect(d).toMatchObject({
      kind: 'DATA_CATEGORY',
      status: 'NOT_STARTED',
      dueDate: '2026-11-28',
      order: 1,
    })
    const updated = await svc.update(
      {
        id: d.id,
        status: DeliverableStatus.IN_REVIEW,
        links: [{ label: 'Sheet', url: 'https://docs.example.com/x' }],
      },
      'ada',
    )
    expect(updated.status).toBe('IN_REVIEW')
    expect(updated.links).toEqual([{ label: 'Sheet', url: 'https://docs.example.com/x' }])
    expect(db.activity.at(-1)?.summary).toBe('marked Pharmacy item master as in review')
    await expect(
      svc.update(
        {
          id: d.id,
          links: Array.from({ length: 21 }, (_, i) => ({ label: `l${i}`, url: 'https://x' })),
        },
        'ada',
      ),
    ).rejects.toThrow('At most 20')
  })

  it('lets the reviewer or a Manager record the outcome; approval marks it ready', async () => {
    const d = await svc.add(
      { projectId: 'p1', phaseId: 'ph1', title: 'Charter', reviewerId: 'bo' },
      'ada',
    )
    await expect(
      svc.review({ id: d.id, outcome: ReviewOutcome.APPROVED }, 'ada'),
    ).rejects.toBeInstanceOf(ForbiddenException)
    const changes = await svc.review(
      { id: d.id, outcome: ReviewOutcome.CHANGES_REQUESTED, note: 'Add owners' },
      'bo',
    )
    expect(changes).toMatchObject({
      reviewOutcome: 'CHANGES_REQUESTED',
      reviewNote: 'Add owners',
      status: 'IN_PROGRESS',
    })
    access.assertMember.mockResolvedValue('MANAGER')
    const approved = await svc.review({ id: d.id, outcome: ReviewOutcome.APPROVED }, 'ada')
    expect(approved.status).toBe('READY')
    expect(approved.reviewedAt).toBeInstanceOf(Date)
    expect(db.activity.map((a) => a.kind)).toEqual([
      'DELIVERABLE_ADDED',
      'DELIVERABLE_REVIEWED',
      'DELIVERABLE_REVIEWED',
    ])
  })

  it('removes a deliverable and records it', async () => {
    const d = await svc.add({ projectId: 'p1', phaseId: 'ph1', title: 'Charter' }, 'ada')
    expect(await svc.remove(d.id, 'ada')).toBe(true)
    expect(db.rows).toHaveLength(0)
    expect(db.activity.at(-1)).toMatchObject({ kind: 'DELIVERABLE_REMOVED' })
  })
})
