import { ConflictException, ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { InvitesService } from '../invites/invites.service.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { ProjectAccessService } from './project-access.service.js'
import { ProjectRole } from './entities/enums.js'
import { ProjectsService } from './projects.service.js'

const PEOPLE: Record<
  string,
  { id: string; name: string; email: string; image: null; banned: boolean }
> = {
  ada: { id: 'ada', name: 'Ada', email: 'ada@x.dev', image: null, banned: false },
  bo: { id: 'bo', name: 'Bo', email: 'bo@x.dev', image: null, banned: false },
  gus: { id: 'gus', name: 'Gus', email: 'gus@x.dev', image: null, banned: true },
}

function fakeDb() {
  let seq = 0
  const projects: Array<Record<string, unknown> & { id: string }> = []
  const members: Array<{ projectId: string; userId: string; role: string; addedAt: Date }> = []
  const phases: Array<{
    id: string
    projectId: string
    name: string
    order: number
    templatePhaseId: string | null
  }> = []
  const deliverables: Array<{
    id: string
    phaseId: string
    title: string
    kind: string
    order: number
  }> = []
  const activity: Array<{ kind: string; summary: string; actorId: string | null }> = []
  const template = [
    {
      id: 'tpl_1',
      name: 'Kickoff',
      description: 'Align',
      order: 1,
      deliverables: [{ id: 'td1', title: 'Charter', kind: 'OUTPUT', order: 1 }],
    },
    {
      id: 'tpl_2',
      name: 'Data Gathering',
      description: null,
      order: 2,
      deliverables: [
        { id: 'td2', title: 'Users', kind: 'DATA_CATEGORY', order: 1 },
        { id: 'td3', title: 'Items', kind: 'DATA_CATEGORY', order: 2 },
      ],
    },
  ]
  const client = {
    templatePhase: { findMany: async () => template },
    project: {
      create: async ({
        data,
      }: {
        data: Record<string, unknown> & { members?: { create: { userId: string; role: string } } }
      }) => {
        const row = {
          id: `p${++seq}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'ACTIVE',
          ...data,
        }
        delete (row as { members?: unknown }).members
        projects.push(row)
        if (data.members)
          members.push({ projectId: row.id, ...data.members.create, addedAt: new Date() })
        return row
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const p = projects.find((x) => x.id === where.id)
        if (!p) return null
        return {
          ...p,
          phases: phases
            .filter((ph) => ph.projectId === p.id)
            .sort((a, b) => a.order - b.order)
            .map((ph) => ({
              ...ph,
              description: null,
              owner: null,
              startDate: null,
              endDate: null,
              status: 'UPCOMING',
              tasks: [],
              deliverables: deliverables
                .filter((d) => d.phaseId === ph.id)
                .map((d) => ({
                  ...d,
                  owner: null,
                  reviewer: null,
                  dueDate: null,
                  status: 'NOT_STARTED',
                  reviewOutcome: null,
                  reviewNote: null,
                  reviewedAt: null,
                  links: [],
                })),
            })),
          members: members
            .filter((m) => m.projectId === p.id)
            .map((m) => ({ ...m, user: PEOPLE[m.userId] })),
          stakeholders: [],
          invites: [],
        }
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const p = projects.find((x) => x.id === where.id)!
        Object.assign(p, data)
        return p
      },
      // Records the arguments so the sort and the filtered count can be asserted (feature 010).
      findMany: vi.fn(async () =>
        projects.map((p) => ({
          ...p,
          members: members.filter((m) => m.projectId === p.id).map((m) => ({ role: m.role })),
          phases: [],
          tasks: [],
          _count: { tasks: 2 },
        })),
      ),
      count: async () => projects.length,
    },
    projectActivity: {
      create: async ({
        data,
      }: {
        data: { kind: string; summary: string; actorId: string | null }
      }) => activity.push(data),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
    projectPhase: {
      create: async ({
        data,
      }: {
        data: { projectId: string; name: string; order: number; templatePhaseId: string | null }
      }) => {
        const row = { id: `ph${++seq}`, ...data }
        phases.push(row)
        return row
      },
    },
    projectDeliverable: {
      create: async ({
        data,
      }: {
        data: { phaseId: string; title: string; kind: string; order: number }
      }) => {
        const row = { id: `d${++seq}`, ...data }
        deliverables.push(row)
        return row
      },
    },
    projectMember: {
      create: async ({ data }: { data: { projectId: string; userId: string; role: string } }) => {
        members.push({ ...data, addedAt: new Date() })
      },
      update: async ({
        where,
        data,
      }: {
        where: { projectId_userId: { projectId: string; userId: string } }
        data: { role: string }
      }) => {
        const m = members.find(
          (x) =>
            x.projectId === where.projectId_userId.projectId &&
            x.userId === where.projectId_userId.userId,
        )!
        m.role = data.role
      },
      delete: async ({
        where,
      }: {
        where: { projectId_userId: { projectId: string; userId: string } }
      }) => {
        members.splice(
          members.findIndex(
            (x) =>
              x.projectId === where.projectId_userId.projectId &&
              x.userId === where.projectId_userId.userId,
          ),
          1,
        )
      },
      count: async ({
        where,
      }: {
        where: { projectId: string; role: string; userId: { not: string } }
      }) =>
        members.filter(
          (m) =>
            m.projectId === where.projectId &&
            m.role === where.role &&
            m.userId !== where.userId.not,
        ).length,
      findUnique: async ({
        where,
      }: {
        where: { projectId_userId: { projectId: string; userId: string } }
      }) =>
        members.find(
          (x) =>
            x.projectId === where.projectId_userId.projectId &&
            x.userId === where.projectId_userId.userId,
        ) ?? null,
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => PEOPLE[where.id] ?? null,
      findFirst: async ({ where }: { where: { email: string } }) =>
        Object.values(PEOPLE).find((p) => p.email === where.email && !p.banned) ?? null,
    },
  }
  return {
    projects,
    members,
    phases,
    deliverables,
    activity,
    client: {
      ...client,
      $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) => fn(client),
    },
  }
}

describe('ProjectsService', () => {
  let db: ReturnType<typeof fakeDb>
  let svc: ProjectsService
  const invites = { setProjectJoin: vi.fn(), inviteUser: vi.fn() }
  let access: ProjectAccessService

  beforeEach(async () => {
    vi.clearAllMocks()
    db = fakeDb()
    const module = await Test.createTestingModule({
      providers: [
        ProjectsService,
        ProjectAccessService,
        { provide: PrismaService, useValue: { client: db.client } },
        { provide: InvitesService, useValue: invites },
      ],
    }).compile()
    svc = module.get(ProjectsService)
    access = module.get(ProjectAccessService)
    svc.onModuleInit()
  })

  it('creates a project from the template with the creator as Manager (FR-001, FR-002)', async () => {
    const project = await svc.create(
      {
        name: ' Northstar HIS ',
        hospitalName: 'Northstar',
        startDate: '2026-06-01',
        targetGoLiveDate: '2027-02-16',
      },
      'ada',
    )
    expect(project.name).toBe('Northstar HIS')
    expect(project.phases.map((p) => [p.name, p.order])).toEqual([
      ['Kickoff', 1],
      ['Data Gathering', 2],
    ])
    expect(project.phases[1].deliverables.map((d) => d.kind)).toEqual([
      'DATA_CATEGORY',
      'DATA_CATEGORY',
    ])
    expect(project.myRole).toBe('MANAGER')
    expect(project.can).toEqual({ manage: true, edit: true })
    expect(project.members.map((m) => [m.user.name, m.role])).toEqual([['Ada', 'MANAGER']])
    expect(project.summary).toMatchObject({ phaseCount: 2, totalTasks: 0, progress: 0 })
    expect(db.activity[0]).toMatchObject({ kind: 'PROJECT_CREATED', actorId: 'ada' })
    expect(invites.setProjectJoin).toHaveBeenCalled()
  })

  it('refuses a go-live date before the start date', async () => {
    await expect(
      svc.create(
        { name: 'x', hospitalName: 'y', startDate: '2026-06-01', targetGoLiveDate: '2026-05-01' },
        'ada',
      ),
    ).rejects.toThrow('Target go-live must not be before the start date')
  })

  it('hides the project from non-members', async () => {
    const { id } = await svc.create({ name: 'Northstar HIS', hospitalName: 'Northstar' }, 'ada')
    await expect(svc.get(id, 'bo')).rejects.toThrow('Project not found')
    await expect(svc.update({ id, name: 'Other' }, 'bo')).rejects.toThrow('Project not found')
  })

  it('adds members, changes roles and keeps at least one Manager (FR-011a)', async () => {
    const { id } = await svc.create({ name: 'Northstar HIS', hospitalName: 'Northstar' }, 'ada')
    const withBo = await svc.addMember(id, 'bo', ProjectRole.MEMBER, 'ada')
    expect(withBo.members.map((m) => [m.user.id, m.role])).toEqual([
      ['ada', 'MANAGER'],
      ['bo', 'MEMBER'],
    ])
    await expect(svc.addMember(id, 'bo', ProjectRole.MEMBER, 'ada')).rejects.toBeInstanceOf(
      ConflictException,
    )
    await expect(svc.addMember(id, 'gus', ProjectRole.MEMBER, 'ada')).rejects.toThrow('deactivated')
    await expect(svc.setMemberRole(id, 'ada', ProjectRole.MEMBER, 'ada')).rejects.toThrow(
      'at least one Manager',
    )
    await expect(svc.removeMember(id, 'ada', 'ada')).rejects.toThrow('at least one Manager')
    await svc.setMemberRole(id, 'bo', ProjectRole.MANAGER, 'ada')
    const demoted = await svc.setMemberRole(id, 'ada', ProjectRole.MEMBER, 'ada')
    expect(demoted.members.find((m) => m.user.id === 'ada')?.role).toBe('MEMBER')
    expect(await access.membershipFor(id, 'ada')).toBe('MEMBER')
    expect(db.activity.map((a) => a.kind)).toContain('MEMBER_ROLE_CHANGED')
    // Ada is a Member now: managing people is refused.
    await expect(svc.addMember(id, 'gus', ProjectRole.MEMBER, 'ada')).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('adds an existing account directly and invites an unknown email with project context', async () => {
    const { id } = await svc.create({ name: 'Northstar HIS', hospitalName: 'Northstar' }, 'ada')
    const direct = await svc.inviteMember(
      { projectId: id, email: 'BO@x.dev', role: ProjectRole.MEMBER },
      'ada',
    )
    expect(direct.joinedUserId).toBe('bo')
    expect(invites.inviteUser).not.toHaveBeenCalled()
    invites.inviteUser.mockResolvedValue({
      invite: { id: 'inv1', email: 'cy@x.dev', expiresAt: new Date('2026-12-04') },
      token: 't',
      inviteUrl: 'u',
      emailSent: true,
    })
    const invited = await svc.inviteMember(
      { projectId: id, email: 'cy@x.dev', role: ProjectRole.MANAGER },
      'ada',
    )
    expect(invites.inviteUser).toHaveBeenCalledWith({
      email: 'cy@x.dev',
      invitedById: 'ada',
      project: { id, role: 'MANAGER', name: 'Northstar HIS', hospitalName: 'Northstar' },
    })
    expect(invited.invite).toMatchObject({
      id: 'inv1',
      email: 'cy@x.dev',
      role: ProjectRole.MANAGER,
    })
    expect(invited.emailSent).toBe(true)
    expect(db.activity.at(-1)).toMatchObject({ kind: 'MEMBER_INVITED' })
  })

  it('joins a project from an accepted invite exactly once', async () => {
    const { id } = await svc.create({ name: 'Northstar HIS', hospitalName: 'Northstar' }, 'ada')
    const tx = db.client as unknown as Parameters<ProjectsService['joinFromInvite']>[0]
    await svc.joinFromInvite(tx, { projectId: id, userId: 'bo', role: 'MEMBER' })
    await svc.joinFromInvite(tx, { projectId: id, userId: 'bo', role: 'MEMBER' })
    expect(db.members.filter((m) => m.userId === 'bo')).toHaveLength(1)
    expect(db.activity.filter((a) => a.kind === 'MEMBER_ADDED')).toHaveLength(1)
  })
  describe('list sort, my open tasks and activity filter (feature 010)', () => {
    it('sorts by recent activity by default and by go-live on request, counting my open tasks', async () => {
      await svc.create({ name: 'Northstar HIS', hospitalName: 'Northstar' }, 'ada')
      const recent = await svc.listMine('ada')
      expect(db.client.project.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
          include: expect.objectContaining({
            _count: {
              select: { tasks: { where: { ownerId: 'ada', status: { not: 'COMPLETE' } } } },
            },
          }),
        }),
      )
      expect(recent.data[0].myOpenTasks).toBe(2)
      await svc.listMine('ada', {}, 'GO_LIVE' as never)
      expect(db.client.project.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [{ targetGoLiveDate: { sort: 'asc', nulls: 'last' } }, { updatedAt: 'desc' }],
        }),
      )
    })

    it('narrows the activity to one target when asked', async () => {
      const project = await svc.create({ name: 'Northstar HIS', hospitalName: 'Northstar' }, 'ada')
      await svc.activity(project.id, 'ada', {}, 't1')
      expect(db.client.projectActivity.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { projectId: project.id, targetId: 't1' } }),
      )
      expect(db.client.projectActivity.count).toHaveBeenLastCalledWith({
        where: { projectId: project.id, targetId: 't1' },
      })
      await svc.activity(project.id, 'ada')
      expect(db.client.projectActivity.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { projectId: project.id } }),
      )
    })
  })
})
