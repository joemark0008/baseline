import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../../prisma/prisma.service.js'
import { ProjectAccessService } from './project-access.service.js'

describe('ProjectAccessService', () => {
  const members = [
    { projectId: 'p1', userId: 'ada', role: 'MANAGER' },
    { projectId: 'p1', userId: 'bo', role: 'MEMBER' },
    { projectId: 'p2', userId: 'bo', role: 'MANAGER' },
  ]
  const client = {
    projectMember: {
      findUnique: async ({
        where,
      }: {
        where: { projectId_userId: { projectId: string; userId: string } }
      }) =>
        members.find(
          (m) =>
            m.projectId === where.projectId_userId.projectId &&
            m.userId === where.projectId_userId.userId,
        ) ?? null,
      findMany: async ({ where }: { where: { userId: string } }) =>
        members.filter((m) => m.userId === where.userId),
    },
  }
  let access: ProjectAccessService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProjectAccessService, { provide: PrismaService, useValue: { client } }],
    }).compile()
    access = module.get(ProjectAccessService)
  })

  it('reports the project role, or null for a non-member', async () => {
    expect(await access.membershipFor('p1', 'ada')).toBe('MANAGER')
    expect(await access.membershipFor('p1', 'bo')).toBe('MEMBER')
    expect(await access.membershipFor('p1', 'cy')).toBeNull()
  })

  it('hides a project from non-members with NotFound (no existence leak)', async () => {
    await expect(access.assertMember('p1', 'cy')).rejects.toBeInstanceOf(NotFoundException)
    await expect(access.assertMember('nope', 'ada')).rejects.toBeInstanceOf(NotFoundException)
    expect(await access.assertMember('p1', 'bo')).toBe('MEMBER')
  })

  it('lets only Managers manage, and still hides the project from outsiders', async () => {
    expect(await access.assertManager('p1', 'ada')).toBe('MANAGER')
    await expect(access.assertManager('p1', 'bo')).rejects.toBeInstanceOf(ForbiddenException)
    await expect(access.assertManager('p1', 'cy')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('lists the ids of the projects a person belongs to', async () => {
    expect(await access.projectIdsFor('bo')).toEqual(['p1', 'p2'])
    expect(await access.projectIdsFor('cy')).toEqual([])
  })
})
