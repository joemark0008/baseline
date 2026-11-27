import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import { recordActivity } from './activity.js'
import { assertDateOrder, fromIsoDate, toIsoDate } from './dates.js'
import type { PhaseStatus } from './entities/enums.js'
import { ProjectPhase } from './entities/project.entity.js'
import { PERSON, toPhase, type PhaseRow } from './mappers.js'
import { ProjectAccessService } from './project-access.service.js'

export const PHASE_NOT_EMPTY = 'Move its tasks and deliverables first'
export const PHASE_DATE_RULE = 'End date must not be before start date'

const PHASE_INCLUDE = {
  owner: PERSON,
  tasks: {
    include: { owner: PERSON, predecessor: { select: { id: true, title: true } } },
    orderBy: [{ dueDate: 'asc' as const }, { title: 'asc' as const }],
  },
  deliverables: {
    include: { owner: PERSON, reviewer: PERSON },
    orderBy: { order: 'asc' as const },
  },
}

/** A project's own copy of the lifecycle (FR-003, FR-004). Managers tailor it. */
@Injectable()
export class PhasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async add(
    input: { projectId: string; name: string; description?: string | null },
    actorId: string,
  ): Promise<ProjectPhase> {
    await this.access.assertManager(input.projectId, actorId)
    const name = input.name.trim()
    const row = await this.prisma.client.$transaction(async (tx) => {
      const count = await tx.projectPhase.count({ where: { projectId: input.projectId } })
      const created = await tx.projectPhase.create({
        data: {
          projectId: input.projectId,
          name,
          description: input.description?.trim() || null,
          order: count + 1,
        },
        include: PHASE_INCLUDE,
      })
      await recordActivity(tx, {
        projectId: input.projectId,
        actorId,
        kind: 'PHASE_ADDED',
        targetType: 'phase',
        targetId: created.id,
        summary: `added phase ${name}`,
      })
      return created
    })
    return toPhase(row as unknown as PhaseRow)
  }

  async update(
    input: {
      id: string
      name?: string | null
      description?: string | null
      ownerId?: string | null
      startDate?: string | null
      endDate?: string | null
      status?: PhaseStatus | null
    },
    actorId: string,
  ): Promise<ProjectPhase> {
    const current = await this.find(input.id)
    await this.access.assertManager(current.projectId, actorId)
    const startDate = input.startDate !== undefined ? input.startDate : toIsoDate(current.startDate)
    const endDate = input.endDate !== undefined ? input.endDate : toIsoDate(current.endDate)
    assertDateOrder(startDate, endDate, PHASE_DATE_RULE)
    if (input.ownerId) await this.access.assertMember(current.projectId, input.ownerId)
    const row = await this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.projectPhase.update({
        where: { id: input.id },
        data: {
          ...(input.name != null ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          ...(input.ownerId !== undefined ? { ownerId: input.ownerId || null } : {}),
          ...(input.startDate !== undefined ? { startDate: fromIsoDate(input.startDate) } : {}),
          ...(input.endDate !== undefined ? { endDate: fromIsoDate(input.endDate) } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: PHASE_INCLUDE,
      })
      await recordActivity(tx, {
        projectId: current.projectId,
        actorId,
        kind: 'PHASE_UPDATED',
        targetType: 'phase',
        targetId: input.id,
        summary: `updated phase ${updated.name}`,
        details: changedKeys(input),
      })
      return updated
    })
    return toPhase(row as unknown as PhaseRow)
  }

  /** `phaseIds` must list every phase of the project exactly once. */
  async reorder(projectId: string, phaseIds: string[], actorId: string): Promise<ProjectPhase[]> {
    await this.access.assertManager(projectId, actorId)
    const current = await this.prisma.client.projectPhase.findMany({ where: { projectId } })
    const known = new Set(current.map((p) => p.id))
    const unique = new Set(phaseIds)
    if (
      phaseIds.length !== known.size ||
      unique.size !== phaseIds.length ||
      phaseIds.some((id) => !known.has(id))
    ) {
      throw new BadRequestException('Reorder must list every phase of the project exactly once')
    }
    await this.prisma.client.$transaction(async (tx) => {
      for (const [i, id] of phaseIds.entries()) {
        await tx.projectPhase.update({ where: { id }, data: { order: i + 1 } })
      }
      await recordActivity(tx, {
        projectId,
        actorId,
        kind: 'PHASES_REORDERED',
        targetType: 'project',
        targetId: projectId,
        summary: 'reordered the phases',
      })
    })
    const rows = await this.prisma.client.projectPhase.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: PHASE_INCLUDE,
    })
    return rows.map((r) => toPhase(r as unknown as PhaseRow))
  }

  async remove(id: string, actorId: string): Promise<boolean> {
    const current = await this.find(id)
    await this.access.assertManager(current.projectId, actorId)
    const [tasks, deliverables] = await Promise.all([
      this.prisma.client.projectTask.count({ where: { phaseId: id } }),
      this.prisma.client.projectDeliverable.count({ where: { phaseId: id } }),
    ])
    if (tasks > 0 || deliverables > 0) throw new BadRequestException(PHASE_NOT_EMPTY)
    await this.prisma.client.$transaction(async (tx) => {
      await tx.projectPhase.delete({ where: { id } })
      const rest = await tx.projectPhase.findMany({
        where: { projectId: current.projectId },
        orderBy: { order: 'asc' },
      })
      for (const [i, phase] of rest.entries()) {
        if (phase.order !== i + 1)
          await tx.projectPhase.update({ where: { id: phase.id }, data: { order: i + 1 } })
      }
      await recordActivity(tx, {
        projectId: current.projectId,
        actorId,
        kind: 'PHASE_REMOVED',
        targetType: 'phase',
        targetId: id,
        summary: `removed phase ${current.name}`,
      })
    })
    return true
  }

  private async find(id: string) {
    const row = await this.prisma.client.projectPhase.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Phase not found')
    return row
  }
}

export function changedKeys(input: Record<string, unknown>): { fields: string[] } {
  return { fields: Object.keys(input).filter((k) => k !== 'id' && input[k] !== undefined) }
}
