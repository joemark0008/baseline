import '../src/config/load-dotenv.js'
import 'reflect-metadata'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AccessService } from '../src/feature/access/access.service.js'
import { AppModule } from '../src/app.module.js'
import { APP_ENV, type AppEnv } from '../src/config/env.js'
import { InvitesService } from '../src/feature/invites/invites.service.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

/** Persistence and access rules of the implementation projects (feature 007, increment 2). */
const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip

type GqlResult<D> = {
  data: D | null
  errors?: Array<{ message: string; extensions?: { code?: string } }>
}

describeWithDb('Implementation projects (e2e)', () => {
  let app: INestApplication
  let baseUrl: string
  let origin: string
  const stamp = Date.now()
  const adminId = `pm-admin-${stamp}`
  const emails: string[] = []
  let projectId = ''

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleFixture.createNestApplication({ bodyParser: false })
    await app.listen(0)
    baseUrl = await app.getUrl()
    origin = app.get<AppEnv>(APP_ENV).webOrigins[0]
    const prisma = app.get(PrismaService).client
    await prisma.user.create({
      data: { id: adminId, name: 'PM Admin', email: `pm-admin-${stamp}@test.dev` },
    })
    await app.get(AccessService).assignRole(adminId, 'role_admin')
  })

  afterAll(async () => {
    const prisma = app.get(PrismaService).client
    if (projectId) await prisma.project.deleteMany({ where: { id: projectId } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.invite.deleteMany({ where: { invitedById: adminId } })
    await prisma.user.deleteMany({ where: { id: adminId } })
    await app.close()
  })

  async function gql<D>(cookie: string, query: string, variables?: object): Promise<GqlResult<D>> {
    const res = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, origin },
      body: JSON.stringify({ query, variables }),
    })
    return (await res.json()) as GqlResult<D>
  }

  /** Invites a person into `role`, signs them up over HTTP and accepts; returns their cookie and id. */
  async function personIn(
    role: string,
    label: string,
  ): Promise<{ cookie: string; id: string; email: string }> {
    const email = `${label}-${stamp}@test.dev`
    emails.push(email)
    const { token } = await app
      .get(InvitesService)
      .inviteUser({ email, roleId: role, invitedById: adminId })
    const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email, password: 'longenough', name: label }),
    })
    expect(res.status).toBe(200)
    const cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')
    const accepted = await gql<unknown>(
      cookie,
      'mutation ($t: String!) { acceptInvite(token: $t) { roleName } }',
      { t: token },
    )
    expect(accepted.errors).toBeUndefined()
    const me = await gql<{ me: { id: string } }>(cookie, '{ me { id } }')
    return { cookie, id: me.data!.me.id, email }
  }

  let manager: { cookie: string; id: string; email: string }
  let outsider: { cookie: string; id: string; email: string }

  it('creates a project from the nine-phase template and persists it (US1)', async () => {
    manager = await personIn('role_admin', 'manager')
    outsider = await personIn('role_admin', 'outsider')
    const created = await gql<{
      createProject: {
        id: string
        myRole: string
        phases: { name: string; order: number; deliverables: { kind: string }[] }[]
      }
    }>(
      manager.cookie,
      `mutation ($i: CreateProjectInput!) { createProject(input: $i) { id myRole phases { name order deliverables { kind } } } }`,
      {
        i: {
          name: 'Northstar HIS',
          hospitalName: 'Northstar Community Hospital',
          startDate: '2026-06-01',
          targetGoLiveDate: '2027-02-16',
        },
      },
    )
    expect(created.errors).toBeUndefined()
    projectId = created.data!.createProject.id
    const phases = created.data!.createProject.phases
    expect(phases.map((p) => p.name)).toEqual([
      'Kickoff',
      'Data Gathering',
      'Data Build-Up',
      'Requirements Analysis',
      'Training',
      'Pre-Go-Live',
      'Go-Live',
      'Post-Go-Live Support',
      'Monitoring & Continuous Improvement',
    ])
    expect(phases[1].deliverables.some((d) => d.kind === 'DATA_CATEGORY')).toBe(true)
    expect(created.data!.createProject.myRole).toBe('MANAGER')
  })

  it('hides the project from non-members and lets a Manager tailor the plan (FR-003, FR-014)', async () => {
    const denied = await gql<{ project: unknown }>(
      outsider.cookie,
      'query ($id: ID!) { project(id: $id) { id } }',
      { id: projectId },
    )
    expect(denied.data).toBeNull()
    expect(denied.errors?.[0].message).toBe('Project not found')
    const read = await gql<{ project: { phases: { id: string; name: string }[] } }>(
      manager.cookie,
      'query ($id: ID!) { project(id: $id) { phases { id name } } }',
      { id: projectId },
    )
    const kickoff = read.data!.project.phases[0]
    const renamed = await gql<{ updateProjectPhase: { name: string; startDate: string } }>(
      manager.cookie,
      'mutation ($i: UpdatePhaseInput!) { updateProjectPhase(input: $i) { name startDate } }',
      {
        i: {
          id: kickoff.id,
          name: 'Project kickoff',
          startDate: '2026-06-01',
          endDate: '2026-06-15',
          status: 'COMPLETE',
        },
      },
    )
    expect(renamed.data!.updateProjectPhase).toEqual({
      name: 'Project kickoff',
      startDate: '2026-06-01',
    })
    const again = await gql<{
      project: { phases: { name: string }[]; summary: { completePhases: number } }
    }>(
      manager.cookie,
      'query ($id: ID!) { project(id: $id) { phases { name } summary { completePhases } } }',
      { id: projectId },
    )
    expect(again.data!.project.phases[0].name).toBe('Project kickoff')
    expect(again.data!.project.summary.completePhases).toBe(1)
  })

  it('tracks tasks with overdue detection and refuses cycles (US2, FR-008, FR-009)', async () => {
    const read = await gql<{ project: { phases: { id: string }[] } }>(
      manager.cookie,
      'query ($id: ID!) { project(id: $id) { phases { id } } }',
      { id: projectId },
    )
    const phaseId = read.data!.project.phases[4].id
    const CREATE =
      'mutation ($i: CreateTaskInput!) { createProjectTask(input: $i) { id overdue status } }'
    const late = await gql<{ createProjectTask: { id: string; overdue: boolean } }>(
      manager.cookie,
      CREATE,
      {
        i: { projectId, phaseId, title: 'Late task', dueDate: '2020-01-01' },
      },
    )
    expect(late.data!.createProjectTask.overdue).toBe(true)
    const next = await gql<{ createProjectTask: { id: string } }>(manager.cookie, CREATE, {
      i: { projectId, phaseId, title: 'Next task', predecessorId: late.data!.createProjectTask.id },
    })
    const cycle = await gql<unknown>(
      manager.cookie,
      'mutation ($i: UpdateTaskInput!) { updateProjectTask(input: $i) { id } }',
      {
        i: { id: late.data!.createProjectTask.id, predecessorId: next.data!.createProjectTask.id },
      },
    )
    expect(cycle.errors?.[0].message).toBe('This dependency would create a cycle')
    const badDates = await gql<unknown>(manager.cookie, CREATE, {
      i: { projectId, phaseId, title: 'x', startDate: '2026-02-02', dueDate: '2026-02-01' },
    })
    expect(badDates.errors?.[0].message).toBe('Due date must not be before start date')
    const overdue = await gql<{ projectTasks: { title: string }[] }>(
      manager.cookie,
      'query ($p: ID!) { projectTasks(projectId: $p, overdue: true) { title } }',
      { p: projectId },
    )
    expect(overdue.data!.projectTasks.map((t) => t.title)).toEqual(['Late task'])
  })

  it('adds members, keeps a Manager, records comments and activity (US3)', async () => {
    const member = await personIn('role_member', 'member')
    const added = await gql<{ addProjectMember: { members: { role: string }[] } }>(
      manager.cookie,
      'mutation ($p: ID!, $u: ID!) { addProjectMember(projectId: $p, userId: $u, role: MEMBER) { members { role } } }',
      { p: projectId, u: member.id },
    )
    expect(added.data!.addProjectMember.members.map((m) => m.role)).toEqual(['MANAGER', 'MEMBER'])
    const demote = await gql<unknown>(
      manager.cookie,
      'mutation ($p: ID!, $u: ID!) { setProjectMemberRole(projectId: $p, userId: $u, role: MEMBER) { id } }',
      { p: projectId, u: manager.id },
    )
    expect(demote.errors?.[0].message).toBe('A project needs at least one Manager')
    const tasks = await gql<{ projectTasks: { id: string }[] }>(
      member.cookie,
      'query ($p: ID!) { projectTasks(projectId: $p) { id } }',
      { p: projectId },
    )
    const comment = await gql<{
      addTaskComment: { author: { name: string }; mentions: { id: string }[] }
    }>(
      member.cookie,
      'mutation ($i: AddTaskCommentInput!) { addTaskComment(input: $i) { author { name } mentions { id } } }',
      {
        i: {
          taskId: tasks.data!.projectTasks[0].id,
          body: 'Checked with nursing',
          mentionUserIds: [manager.id],
        },
      },
    )
    expect(comment.data!.addTaskComment.author.name).toBe('member')
    expect(comment.data!.addTaskComment.mentions.map((m) => m.id)).toEqual([manager.id])
    const memberCannotManage = await gql<unknown>(
      member.cookie,
      'mutation ($i: AddPhaseInput!) { addProjectPhase(input: $i) { id } }',
      { i: { projectId, name: 'Extra' } },
    )
    expect(memberCannotManage.errors?.[0].extensions?.code).toBe('FORBIDDEN')
    const activity = await gql<{
      projectActivity: { data: { kind: string; actor: { name: string } }[] }
    }>(
      manager.cookie,
      'query ($p: ID!) { projectActivity(projectId: $p, perPage: 50) { data { kind actor { name } } } }',
      { p: projectId },
    )
    const kinds = activity.data!.projectActivity.data.map((a) => a.kind)
    expect(kinds).toContain('PROJECT_CREATED')
    expect(kinds).toContain('PHASE_UPDATED')
    expect(kinds).toContain('TASK_CREATED')
    expect(kinds).toContain('MEMBER_ADDED')
    expect(kinds[0]).toBe('COMMENT_ADDED')
    expect(activity.data!.projectActivity.data[0].actor.name).toBe('member')
  })
})
