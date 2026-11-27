import '../src/config/load-dotenv.js'
import 'reflect-metadata'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AccessService } from '../src/feature/access/access.service.js'
import { AppModule } from '../src/app.module.js'
import { APP_ENV, type AppEnv } from '../src/config/env.js'
import { InvitesService } from '../src/feature/invites/invites.service.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

/** Manual task order, drag-and-drop moves and the list/activity arguments (feature 010). */
const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip

type GqlResult<D> = {
  data: D | null
  errors?: Array<{ message: string; extensions?: { code?: string } }>
}
type Person = { cookie: string; id: string; email: string }
type TaskRow = { id: string; title: string; position: number; status: string; phaseId: string }

describeWithDb('Project workspace (e2e)', () => {
  let app: INestApplication
  let baseUrl: string
  let origin: string
  const stamp = Date.now()
  const adminId = `ws-admin-${stamp}`
  const emails: string[] = []
  let projectId = ''
  let phases: { id: string; name: string }[] = []
  let manager: Person
  let member: Person
  let outsider: Person
  const tasks: TaskRow[] = []

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleFixture.createNestApplication({ bodyParser: false })
    await app.listen(0)
    baseUrl = await app.getUrl()
    origin = app.get<AppEnv>(APP_ENV).webOrigins[0]
    const prisma = app.get(PrismaService).client
    await prisma.user.create({
      data: { id: adminId, name: 'WS Admin', email: `ws-admin-${stamp}@test.dev` },
    })
    await app.get(AccessService).assignRole(adminId, 'role_admin')
    manager = await personIn('role_admin', 'ws-manager')
    member = await personIn('role_member', 'ws-member')
    outsider = await personIn('role_member', 'ws-outsider')
    const created = await gql<{
      createProject: { id: string; phases: { id: string; name: string }[] }
    }>(
      manager.cookie,
      'mutation ($i: CreateProjectInput!) { createProject(input: $i) { id phases { id name } } }',
      {
        i: {
          name: 'Workspace HIS',
          hospitalName: 'Workspace Hospital',
          targetGoLiveDate: '2027-03-01',
        },
      },
    )
    projectId = created.data!.createProject.id
    phases = created.data!.createProject.phases
    await gql(
      manager.cookie,
      'mutation ($p: ID!, $u: ID!, $r: ProjectRole!) { addProjectMember(projectId: $p, userId: $u, role: $r) { id } }',
      { p: projectId, u: member.id, r: 'MEMBER' },
    )
    for (const title of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const res = await gql<{ createProjectTask: TaskRow }>(
        manager.cookie,
        'mutation ($i: CreateTaskInput!) { createProjectTask(input: $i) { id title position status phaseId } }',
        { i: { projectId, phaseId: phases[title < 'D' ? 0 : 1].id, title } },
      )
      tasks.push(res.data!.createProjectTask)
    }
  })

  afterAll(async () => {
    const prisma = app.get(PrismaService).client
    if (manager) await prisma.project.deleteMany({ where: { createdById: manager.id } })
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

  async function personIn(role: string, label: string): Promise<Person> {
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
    await gql(cookie, 'mutation ($t: String!) { acceptInvite(token: $t) { roleName } }', {
      t: token,
    })
    const me = await gql<{ me: { id: string } }>(cookie, '{ me { id } }')
    return { cookie, id: me.data!.me.id, email }
  }

  const MOVE =
    'mutation ($i: MoveTaskInput!) { moveProjectTask(input: $i) { id status phaseId position } }'
  const READ =
    'query ($id: ID!) { project(id: $id) { phases { id tasks { id title position status } } } }'
  const ordered = async (cookie: string) => {
    const read = await gql<{ project: { phases: { tasks: TaskRow[] }[] } }>(cookie, READ, {
      id: projectId,
    })
    return read
      .data!.project.phases.flatMap((p) => p.tasks)
      .sort((a, b) => a.position - b.position)
      .map((t) => t.title)
  }
  const byTitle = (title: string) => tasks.find((t) => t.title === title)!

  it('creates tasks with increasing positions and reads them in that order', async () => {
    expect(tasks.map((t) => t.position)).toEqual([1, 2, 3, 4, 5, 6])
    expect(await ordered(manager.cookie)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
  })

  it('moves a task between neighbours and across phases, with one activity row (US1, US2)', async () => {
    const moved = await gql<{ moveProjectTask: TaskRow }>(member.cookie, MOVE, {
      i: { id: byTitle('E').id, afterTaskId: byTitle('A').id, beforeTaskId: byTitle('B').id },
    })
    expect(moved.errors).toBeUndefined()
    expect(moved.data!.moveProjectTask.position).toBe(1.5)
    expect(await ordered(member.cookie)).toEqual(['A', 'E', 'B', 'C', 'D', 'F'])
    const status = await gql<{ moveProjectTask: TaskRow }>(member.cookie, MOVE, {
      i: { id: byTitle('F').id, status: 'IN_PROGRESS', phaseId: phases[0].id },
    })
    expect(status.data!.moveProjectTask).toMatchObject({
      status: 'IN_PROGRESS',
      phaseId: phases[0].id,
    })
    const activity = await gql<{ projectActivity: { data: { summary: string }[] } }>(
      member.cookie,
      'query ($p: ID!, $t: ID) { projectActivity(projectId: $p, targetId: $t) { data { summary } } }',
      { p: projectId, t: byTitle('F').id },
    )
    expect(activity.data!.projectActivity.data.map((a) => a.summary)).toEqual([
      `moved task F to in progress, moved task F to phase ${phases[0].name}`,
      'created task F',
    ])
  })

  it('writes nothing for a no-op drop and refuses foreign neighbours (FR-013)', async () => {
    const before = await gql<{ projectActivity: { meta: { total: number } } }>(
      manager.cookie,
      'query ($p: ID!) { projectActivity(projectId: $p) { meta { total } } }',
      { p: projectId },
    )
    const same = await gql<{ moveProjectTask: TaskRow }>(manager.cookie, MOVE, {
      i: { id: byTitle('B').id, afterTaskId: byTitle('E').id, beforeTaskId: byTitle('C').id },
    })
    expect(same.errors).toBeUndefined()
    const after = await gql<{ projectActivity: { meta: { total: number } } }>(
      manager.cookie,
      'query ($p: ID!) { projectActivity(projectId: $p) { meta { total } } }',
      { p: projectId },
    )
    expect(after.data!.projectActivity.meta.total).toBe(before.data!.projectActivity.meta.total)
    const other = await gql<{ createProject: { id: string; phases: { id: string }[] } }>(
      manager.cookie,
      'mutation ($i: CreateProjectInput!) { createProject(input: $i) { id phases { id } } }',
      { i: { name: 'Other HIS', hospitalName: 'Other Hospital' } },
    )
    const foreign = await gql<{ createProjectTask: TaskRow }>(
      manager.cookie,
      'mutation ($i: CreateTaskInput!) { createProjectTask(input: $i) { id } }',
      {
        i: {
          projectId: other.data!.createProject.id,
          phaseId: other.data!.createProject.phases[0].id,
          title: 'Foreign',
        },
      },
    )
    const refused = await gql(manager.cookie, MOVE, {
      i: { id: byTitle('A').id, afterTaskId: foreign.data!.createProjectTask.id },
    })
    expect(refused.errors?.[0].message).toBe('Task not found in this project')
    expect(refused.errors?.[0].extensions?.code).toBe('BAD_REQUEST')
    const refusedPhase = await gql(manager.cookie, MOVE, {
      i: { id: byTitle('A').id, phaseId: other.data!.createProject.phases[0].id },
    })
    expect(refusedPhase.errors?.[0].message).toBe('Phase not found in this project')
    await app
      .get(PrismaService)
      .client.project.deleteMany({ where: { id: other.data!.createProject.id } })
  })

  it('denies non-members and keeps the Member allowed (FR-018)', async () => {
    const denied = await gql(outsider.cookie, MOVE, {
      i: { id: byTitle('A').id, status: 'BLOCKED' },
    })
    expect(denied.errors?.[0].extensions?.code).toBe('NOT_FOUND')
    const read = await gql(outsider.cookie, READ, { id: projectId })
    expect(read.errors?.[0].message).toBe('Project not found')
  })

  it('quick-adds with only a title and phase, defaulting status and position (US2)', async () => {
    const res = await gql<{ createProjectTask: TaskRow }>(
      member.cookie,
      'mutation ($i: CreateTaskInput!) { createProjectTask(input: $i) { id title position status phaseId } }',
      { i: { projectId, phaseId: phases[2].id, title: 'Quick' } },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data!.createProjectTask).toMatchObject({ status: 'UPCOMING', position: 7 })
    expect((await ordered(member.cookie)).at(-1)).toBe('Quick')
  })

  it('flags a predecessor conflict and still refuses an inverted date range (US3)', async () => {
    const UPDATE =
      'mutation ($i: UpdateTaskInput!) { updateProjectTask(input: $i) { id predecessorConflict } }'
    await gql(manager.cookie, UPDATE, {
      i: { id: byTitle('A').id, startDate: '2026-12-01', dueDate: '2026-12-10' },
    })
    const conflict = await gql<{ updateProjectTask: { predecessorConflict: boolean } }>(
      manager.cookie,
      UPDATE,
      {
        i: {
          id: byTitle('B').id,
          predecessorId: byTitle('A').id,
          startDate: '2026-12-05',
          dueDate: '2026-12-20',
        },
      },
    )
    expect(conflict.data!.updateProjectTask.predecessorConflict).toBe(true)
    const fine = await gql<{ updateProjectTask: { predecessorConflict: boolean } }>(
      manager.cookie,
      UPDATE,
      { i: { id: byTitle('B').id, startDate: '2026-12-11' } },
    )
    expect(fine.data!.updateProjectTask.predecessorConflict).toBe(false)
    const inverted = await gql(manager.cookie, UPDATE, {
      i: { id: byTitle('B').id, dueDate: '2026-12-02' },
    })
    expect(inverted.errors?.[0].message).toBe('Due date must not be before start date')
  })

  it('moves a deliverable into another phase with contiguous order (US4)', async () => {
    const ADD =
      'mutation ($i: AddDeliverableInput!) { addProjectDeliverable(input: $i) { id title order phaseId } }'
    type D = { id: string; title: string; order: number; phaseId: string }
    const d1 = (
      await gql<{ addProjectDeliverable: D }>(manager.cookie, ADD, {
        i: { projectId, phaseId: phases[3].id, title: 'Spec one' },
      })
    ).data!.addProjectDeliverable
    const d2 = (
      await gql<{ addProjectDeliverable: D }>(manager.cookie, ADD, {
        i: { projectId, phaseId: phases[3].id, title: 'Spec two' },
      })
    ).data!.addProjectDeliverable
    expect(d2.order).toBe(d1.order + 1) // after the phase's seeded template deliverables
    const moved = await gql<{ moveProjectDeliverable: D }>(
      member.cookie,
      'mutation ($i: MoveDeliverableInput!) { moveProjectDeliverable(input: $i) { id order phaseId } }',
      { i: { id: d1.id, phaseId: phases[4].id } },
    )
    expect(moved.errors).toBeUndefined()
    expect(moved.data!.moveProjectDeliverable.phaseId).toBe(phases[4].id)
    const read = await gql<{ project: { phases: { id: string; deliverables: D[] }[] } }>(
      member.cookie,
      'query ($id: ID!) { project(id: $id) { phases { id deliverables { id title order phaseId } } } }',
      { id: projectId },
    )
    const target = read.data!.project.phases.find((p) => p.id === phases[4].id)!
    const origin = read.data!.project.phases.find((p) => p.id === phases[3].id)!
    expect(target.deliverables.at(-1)).toMatchObject({ id: d1.id })
    expect(target.deliverables.map((d) => d.order)).toEqual(
      target.deliverables.map((_, i) => i + 1),
    )
    expect(origin.deliverables.find((d) => d.id === d2.id)!.order).toBe(
      origin.deliverables.findIndex((d) => d.id === d2.id) + 1,
    )
  })

  it('sorts projects by go-live and counts my open tasks (US5)', async () => {
    await gql(
      manager.cookie,
      'mutation ($i: UpdateTaskInput!) { updateProjectTask(input: $i) { id } }',
      {
        i: { id: byTitle('C').id, ownerId: member.id },
      },
    )
    await gql(
      manager.cookie,
      'mutation ($i: UpdateTaskInput!) { updateProjectTask(input: $i) { id } }',
      {
        i: { id: byTitle('D').id, ownerId: member.id, status: 'COMPLETE' },
      },
    )
    const list = await gql<{
      projects: { data: { id: string; myOpenTasks: number; targetGoLiveDate: string | null }[] }
    }>(
      member.cookie,
      'query { projects(perPage: 50, sort: GO_LIVE) { data { id myOpenTasks targetGoLiveDate } } }',
    )
    const mine = list.data!.projects.data.find((p) => p.id === projectId)!
    expect(mine.myOpenTasks).toBe(1)
    const dates = list.data!.projects.data.map((p) => p.targetGoLiveDate)
    const dated = dates.filter((d): d is string => d !== null)
    expect(dated).toEqual([...dated].sort())
    expect(dates.indexOf(null) === -1 || dates.indexOf(null) >= dated.length).toBe(true)
  })
})
