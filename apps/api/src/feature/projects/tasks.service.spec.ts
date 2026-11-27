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
  createdById: string
  createdAt: Date
  updatedAt: Date
}

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
      findMany: async ({
        where,
      }: {
        where: { projectId: string; phaseId?: string; ownerId?: string; status?: string }
      }) =>
        tasks
          .filter(
            (t) =>
              t.projectId === where.projectId &&
              (!where.phaseId || t.phaseId === where.phaseId) &&
              (!where.ownerId || t.ownerId === where.ownerId) &&
              (!where.status || t.status === where.status),
          )
          .map(hydrate),
      create: async ({ data }: { data: Omit<Row, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const row: Row = { id: `t${++seq}`, createdAt: new Date(), updatedAt: new Date(), ...data }
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
          ? { id: 'ph1', projectId: 'p1' }
          : where.id === 'ph9'
            ? { id: 'ph9', projectId: 'p9' }
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
        taskUrl: `https://app.example.com/projects/p1/tasks?task=${task.id}`,
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
})
