import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { APP_ENV } from '../../config/env.js'
import { EmailService } from '../../email/email.service.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { ProjectAccessService } from './project-access.service.js'
import { TaskStatus } from './entities/enums.js'
import { TasksService } from './tasks.service.js'

const PEOPLE: Record<string, { id: string; name: string; email: string; image: null }> = {
  ada: { id: 'ada', name: 'Ada', email: 'ada@x.dev', image: null },
  bo: { id: 'bo', name: 'Bo', email: 'bo@x.dev', image: null },
}

interface Row {
  id: string
  projectId: string
  phaseId: string
  title: string
  description: string | null
  ownerId: string | null
  status: string
  priority: string
  startDate: Date | null
  dueDate: Date | null
  predecessorId: string | null
  position: number
  completedAt?: Date | null
  createdById: string
  createdAt: Date
  updatedAt: Date
}

type Where = {
  projectId?: string
  phaseId?: string
  ownerId?: string
  status?: string
  id?: { not: string }
  position?: { gt?: number; lt?: number }
}
type Order = { position?: 'asc' | 'desc'; dueDate?: 'asc' | 'desc' }
type OrderBy = Order | Order[]

function fakeDb() {
  let seq = 0
  const tasks: Row[] = []
  const comments: Array<{
    id: string
    taskId: string
    authorId: string
    body: string
    mentions: string[]
  }> = []
  const activity: Array<{ kind: string; summary: string }> = []
  const select = (where: Where, orderBy?: OrderBy) => {
    const rows = tasks.filter(
      (t) =>
        (!where.projectId || t.projectId === where.projectId) &&
        (!where.phaseId || t.phaseId === where.phaseId) &&
        (!where.ownerId || t.ownerId === where.ownerId) &&
        (!where.status || t.status === where.status) &&
        (!where.id || t.id !== where.id.not) &&
        (where.position?.gt === undefined || t.position > where.position.gt) &&
        (where.position?.lt === undefined || t.position < where.position.lt),
    )
    const order = Array.isArray(orderBy) ? orderBy[0] : orderBy
    if (order?.position)
      rows.sort((a, b) =>
        order.position === 'asc' ? a.position - b.position : b.position - a.position,
      )
    if (order?.dueDate)
      rows.sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))
    return rows
  }
  const hydrate = (t: Row) => ({
    ...t,
    owner: t.ownerId ? PEOPLE[t.ownerId] : null,
    predecessor: t.predecessorId
      ? { id: t.predecessorId, title: tasks.find((x) => x.id === t.predecessorId)?.title ?? '' }
      : null,
    comments: comments
      .filter((c) => c.taskId === t.id)
      .map((c) => ({
        id: c.id,
        author: PEOPLE[c.authorId],
        body: c.body,
        createdAt: new Date(),
        mentions: c.mentions.map((u) => ({ user: PEOPLE[u] })),
      })),
  })
  const client = {
    projectTask: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const t = tasks.find((x) => x.id === where.id)
        return t ? hydrate(t) : null
      },
      findMany: async ({ where, orderBy }: { where: Where; orderBy?: OrderBy }) =>
        select(where, orderBy).map(hydrate),
      findFirst: async ({ where, orderBy }: { where: Where; orderBy?: OrderBy }) => {
        const first = select(where, orderBy)[0]
        return first ? hydrate(first) : null
      },
      create: async ({
        data,
      }: {
        data: Omit<Row, 'id' | 'createdAt' | 'updatedAt' | 'position'> & { position?: number }
      }) => {
        const row: Row = {
          id: `t${++seq}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          position: 0,
          ...data,
        }
        tasks.push(row)
        return hydrate(row)
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = tasks.find((x) => x.id === where.id)!
        Object.assign(row, data)
        return hydrate(row)
      },
      delete: async ({ where }: { where: { id: string } }) => {
        tasks.splice(
          tasks.findIndex((x) => x.id === where.id),
          1,
        )
      },
    },
    projectPhase: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'ph1'
          ? { id: 'ph1', projectId: 'p1', name: 'Kickoff' }
          : where.id === 'ph2'
            ? { id: 'ph2', projectId: 'p1', name: 'Training' }
            : where.id === 'ph9'
              ? { id: 'ph9', projectId: 'p9', name: 'Elsewhere' }
              : null,
    },
    project: { findUnique: async () => ({ id: 'p1', name: 'Northstar HIS' }) },
    user: { findUnique: async ({ where }: { where: { id: string } }) => PEOPLE[where.id] ?? null },
    taskComment: {
      create: async ({
        data,
      }: {
        data: {
          taskId: string
          authorId: string
          body: string
          mentions: { create: { userId: string }[] }
        }
      }) => {
        const row = {
          id: `c${++seq}`,
          taskId: data.taskId,
          authorId: data.authorId,
          body: data.body,
          mentions: data.mentions.create.map((m) => m.userId),
        }
        comments.push(row)
        return {
          id: row.id,
          author: PEOPLE[row.authorId],
          body: row.body,
          createdAt: new Date(),
          mentions: row.mentions.map((u) => ({ user: PEOPLE[u] })),
        }
      },
    },
    projectActivity: {
      create: async ({ data }: { data: { kind: string; summary: string } }) => activity.push(data),
    },
  }
  return {
    tasks,
    activity,
    client: {
      ...client,
      $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) => fn(client),
    },
  }
}

describe('TasksService', () => {
  let db: ReturnType<typeof fakeDb>
  let svc: TasksService
  const access = { assertMember: vi.fn(), membershipFor: vi.fn() }
  const email = { sendTaskAssigned: vi.fn(), sendMention: vi.fn() }
  const base = { projectId: 'p1', phaseId: 'ph1', title: 'Validate nursing workflows' }

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers({ now: new Date('2026-11-27T10:00:00Z') })
    access.assertMember.mockResolvedValue('MEMBER')
    access.membershipFor.mockImplementation(async (_p: string, u: string) =>
      u in PEOPLE ? 'MEMBER' : null,
    )
    email.sendTaskAssigned.mockResolvedValue(true)
    email.sendMention.mockResolvedValue(true)
    db = fakeDb()
    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: { client: db.client } },
        { provide: ProjectAccessService, useValue: access },
        { provide: EmailService, useValue: email },
        { provide: APP_ENV, useValue: { webOrigins: ['https://app.example.com'] } },
      ],
    }).compile()
    svc = module.get(TasksService)
  })

  afterEach(() => vi.useRealTimers())

  it('creates a task with defaults and derives overdue from today (FR-006, FR-008)', async () => {
    const task = await svc.create({ ...base, dueDate: '2026-11-26' }, 'ada')
    expect(task).toMatchObject({
      status: 'UPCOMING',
      priority: 'MEDIUM',
      dueDate: '2026-11-26',
      overdue: true,
      owner: null,
    })
    const done = await svc.update({ id: task.id, status: TaskStatus.COMPLETE }, 'ada')
    expect(done.overdue).toBe(false)
    expect(db.activity.map((a) => a.summary)).toEqual([
      'created task Validate nursing workflows',
      'moved task Validate nursing workflows to complete',
    ])
  })

  it('enforces the date range, the phase and the owner rules', async () => {
    await expect(
      svc.create({ ...base, startDate: '2026-12-02', dueDate: '2026-12-01' }, 'ada'),
    ).rejects.toThrow('Due date must not be before start date')
    await expect(svc.create({ ...base, phaseId: 'ph9' }, 'ada')).rejects.toThrow('same project')
    await expect(svc.create({ ...base, ownerId: 'nobody' }, 'ada')).rejects.toThrow(
      'member of the project',
    )
  })

  it('refuses self-dependencies and cycles, and accepts a chain (FR-009)', async () => {
    const a = await svc.create({ ...base, title: 'A' }, 'ada')
    const b = await svc.create({ ...base, title: 'B', predecessorId: a.id }, 'ada')
    const c = await svc.create({ ...base, title: 'C', predecessorId: b.id }, 'ada')
    expect(c.predecessor).toEqual({ id: b.id, title: 'B' })
    await expect(svc.update({ id: a.id, predecessorId: a.id }, 'ada')).rejects.toThrow(
      'cannot depend on itself',
    )
    await expect(svc.update({ id: a.id, predecessorId: c.id }, 'ada')).rejects.toThrow(
      'create a cycle',
    )
    await expect(svc.create({ ...base, predecessorId: 'missing' }, 'ada')).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('emails the new owner on assignment, but not when assigning yourself', async () => {
    const task = await svc.create({ ...base, ownerId: 'ada' }, 'ada')
    expect(email.sendTaskAssigned).not.toHaveBeenCalled()
    await svc.update({ id: task.id, ownerId: 'bo', dueDate: '2026-12-03' }, 'ada')
    expect(email.sendTaskAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'bo@x.dev',
        assignedBy: 'Ada',
        dueDate: '2026-12-03',
        taskUrl: `https://app.example.com/projects/p1/list?task=${task.id}`,
      }),
    )
  })

  it('filters by phase, owner, status and overdue (FR-010)', async () => {
    await svc.create({ ...base, title: 'Late', ownerId: 'bo', dueDate: '2026-11-01' }, 'ada')
    await svc.create(
      {
        ...base,
        title: 'Soon',
        ownerId: 'ada',
        dueDate: '2026-12-10',
        status: TaskStatus.IN_PROGRESS,
      },
      'ada',
    )
    expect((await svc.list({ projectId: 'p1', overdue: true }, 'ada')).map((t) => t.title)).toEqual(
      ['Late'],
    )
    expect(
      (await svc.list({ projectId: 'p1', ownerId: 'ada' }, 'ada')).map((t) => t.title),
    ).toEqual(['Soon'])
    expect(
      (await svc.list({ projectId: 'p1', status: TaskStatus.IN_PROGRESS }, 'ada')).map(
        (t) => t.title,
      ),
    ).toEqual(['Soon'])
  })

  it('adds attributed comments, allows only member mentions, and emails the mentioned (FR-012)', async () => {
    const task = await svc.create(base, 'ada')
    const comment = await svc.addComment(
      { taskId: task.id, body: 'Can you check this?', mentionUserIds: ['bo', 'ada'] },
      'ada',
    )
    expect(comment.author.name).toBe('Ada')
    expect(comment.mentions.map((m) => m.id)).toEqual(['bo'])
    expect(email.sendMention).toHaveBeenCalledTimes(1)
    expect(email.sendMention).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'bo@x.dev', author: 'Ada', taskTitle: task.title }),
    )
    await expect(
      svc.addComment({ taskId: task.id, body: 'x', mentionUserIds: ['stranger'] }, 'ada'),
    ).rejects.toThrow('only mention members')
    expect((await svc.get(task.id, 'ada')).comments).toHaveLength(1)
  })
  describe('completion timestamp (feature 011)', () => {
    const now = new Date('2026-11-27T10:00:00Z')
    const stored = (id: string) => db.tasks.find((t) => t.id === id)!

    it('stamps a task created as complete and leaves others null', async () => {
      const done = await svc.create({ ...base, status: TaskStatus.COMPLETE }, 'ada')
      expect(done.completedAt).toEqual(now)
      const open = await svc.create(base, 'ada')
      expect(open.completedAt).toBeNull()
    })

    it('stamps on completion through update and clears on reopening', async () => {
      const task = await svc.create(base, 'ada')
      const done = await svc.update({ id: task.id, status: TaskStatus.COMPLETE }, 'ada')
      expect(done.completedAt).toEqual(now)
      const renamed = await svc.update({ id: task.id, title: 'Renamed' }, 'ada')
      expect(renamed.completedAt).toEqual(now)
      const reopened = await svc.update({ id: task.id, status: TaskStatus.IN_PROGRESS }, 'ada')
      expect(reopened.completedAt).toBeNull()
      expect(stored(task.id).completedAt).toBeNull()
    })

    it('stamps on a drag to Complete and writes nothing for a no-op move', async () => {
      const task = await svc.create(base, 'ada')
      const done = await svc.move({ id: task.id, status: TaskStatus.COMPLETE }, 'ada')
      expect(done.completedAt).toEqual(now)
      const same = await svc.move({ id: task.id, status: TaskStatus.COMPLETE }, 'ada')
      expect(same.completedAt).toEqual(now)
      expect(db.activity.map((a) => a.summary)).toEqual([
        'created task Validate nursing workflows',
        'moved task Validate nursing workflows to complete',
      ])
    })
  })

  describe('manual order and drag-and-drop moves (feature 010)', () => {
    const titles = ['A', 'B', 'C', 'D']
    async function seed() {
      const ids: string[] = []
      for (const title of titles) ids.push((await svc.create({ ...base, title }, 'ada')).id)
      return ids
    }
    const order = () => [...db.tasks].sort((a, b) => a.position - b.position).map((t) => t.title)

    it('gives a new task the highest position in its project', async () => {
      const ids = await seed()
      expect(db.tasks.map((t) => t.position)).toEqual([1, 2, 3, 4])
      const elsewhere = await svc.create({ ...base, projectId: 'p9', phaseId: 'ph9' }, 'ada')
      expect(elsewhere.position).toBe(1)
      expect(ids).toHaveLength(4)
    })

    it('places a task between its neighbours, after the last one, or before the first', async () => {
      const [a, b, c, d] = await seed()
      await svc.move({ id: d, afterTaskId: a, beforeTaskId: b }, 'ada')
      expect(order()).toEqual(['A', 'D', 'B', 'C'])
      expect(db.tasks.find((t) => t.id === d)!.position).toBe(1.5)
      await svc.move({ id: a, afterTaskId: c }, 'ada')
      expect(order()).toEqual(['D', 'B', 'C', 'A'])
      expect(db.tasks.find((t) => t.id === a)!.position).toBe(4)
      await svc.move({ id: c, beforeTaskId: d }, 'ada')
      expect(order()).toEqual(['C', 'D', 'B', 'A'])
      expect(db.tasks.find((t) => t.id === c)!.position).toBe(0.5)
      expect(db.activity.filter((x) => x.summary.startsWith('reordered'))).toHaveLength(3)
    })

    it('renumbers the project when neighbours are too close to split', async () => {
      const [a, b, , d] = await seed()
      db.tasks.find((t) => t.id === a)!.position = 1
      db.tasks.find((t) => t.id === b)!.position = 1 + 1e-9
      await svc.move({ id: d, afterTaskId: a, beforeTaskId: b }, 'ada')
      expect(order()).toEqual(['A', 'D', 'B', 'C'])
      const positions = [...db.tasks].sort((x, y) => x.position - y.position).map((t) => t.position)
      expect(positions).toEqual([1, 1.5, 2, 3])
    })

    it('changes status and phase with one activity row naming both, and never touches dates', async () => {
      const [a, b] = await seed()
      await svc.update({ id: b, dueDate: '2026-12-24', ownerId: 'bo' }, 'ada')
      db.activity.length = 0
      const moved = await svc.move(
        { id: b, status: TaskStatus.IN_PROGRESS, phaseId: 'ph2', afterTaskId: a },
        'ada',
      )
      expect(moved).toMatchObject({ status: 'IN_PROGRESS', phaseId: 'ph2', dueDate: '2026-12-24' })
      expect(moved.owner?.id).toBe('bo')
      expect(db.activity).toHaveLength(1)
      expect(db.activity[0]).toMatchObject({
        kind: 'TASK_UPDATED',
        summary: 'moved task B to in progress, moved task B to phase Training',
      })
    })

    it('writes nothing when the drop changes nothing (FR-013)', async () => {
      const [a, b, c] = await seed()
      db.activity.length = 0
      const same = await svc.move(
        { id: b, afterTaskId: a, beforeTaskId: c, status: TaskStatus.UPCOMING },
        'ada',
      )
      expect(same.position).toBe(2)
      expect(db.activity).toEqual([])
      await svc.move({ id: a, beforeTaskId: b }, 'ada')
      await svc.move({ id: c, afterTaskId: b }, 'ada')
      expect(db.activity).toEqual([])
    })

    it('refuses neighbours or phases from another project, and non-members', async () => {
      const [a] = await seed()
      db.tasks.push({ ...db.tasks[0], id: 'x9', projectId: 'p9', title: 'Foreign' })
      await expect(svc.move({ id: a, afterTaskId: 'x9' }, 'ada')).rejects.toThrow(
        'Task not found in this project',
      )
      await expect(svc.move({ id: a, phaseId: 'ph9' }, 'ada')).rejects.toThrow(
        'Phase not found in this project',
      )
      access.assertMember.mockRejectedValueOnce(new BadRequestException('Project not found'))
      await expect(svc.move({ id: a, status: TaskStatus.BLOCKED }, 'zed')).rejects.toThrow(
        'Project not found',
      )
    })

    it('lists by manual position by default and by due date on request', async () => {
      const [a, , c] = await seed()
      await svc.update({ id: a, dueDate: '2026-12-30' }, 'ada')
      await svc.update({ id: c, dueDate: '2026-12-01' }, 'ada')
      await svc.move({ id: c, beforeTaskId: a }, 'ada')
      const byPosition = await svc.list({ projectId: 'p1' }, 'ada')
      expect(byPosition.map((t) => t.title)).toEqual(['C', 'A', 'B', 'D'])
      const byDue = await svc.list({ projectId: 'p1', sort: 'DUE_DATE' as never }, 'ada')
      expect(byDue[0].title).toBe('C')
    })
  })
})
