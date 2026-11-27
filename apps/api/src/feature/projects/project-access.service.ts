import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'

export type ProjectRole = 'MANAGER' | 'MEMBER'

export const NOT_A_MEMBER = 'Project not found'
export const MANAGER_ONLY = 'Only a project Manager can do this'

/** Answers "may this person touch this project?" (FR-011a, FR-014). Rules live here, not in resolvers. */
@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async membershipFor(projectId: string, userId: string): Promise<ProjectRole | null> {
    const row = await this.prisma.client.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    })
    return row?.role ?? null
  }

  /** Non-members get NotFound so a project's existence is not revealed (SC-005). */
  async assertMember(projectId: string, userId: string): Promise<ProjectRole> {
    const role = await this.membershipFor(projectId, userId)
    if (!role) throw new NotFoundException(NOT_A_MEMBER)
    return role
  }

  async assertManager(projectId: string, userId: string): Promise<ProjectRole> {
    const role = await this.assertMember(projectId, userId)
    if (role !== 'MANAGER') throw new ForbiddenException(MANAGER_ONLY)
    return role
  }

  async projectIdsFor(userId: string): Promise<string[]> {
    const rows = await this.prisma.client.projectMember.findMany({ where: { userId } })
    return rows.map((r) => r.projectId)
  }
}
