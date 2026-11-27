import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import { recordActivity } from './activity.js'
import { fromIsoDate } from './dates.js'
import type { DeliverableKind, DeliverableStatus, ReviewOutcome } from './entities/enums.js'
import { ProjectDeliverable } from './entities/project.entity.js'
import { PERSON, toDeliverable, type DeliverableRow } from './mappers.js'
import { ProjectAccessService } from './project-access.service.js'

export const REVIEWER_ONLY = 'Only the reviewer or a Manager can record a review'
export const MAX_LINKS = 20

const INCLUDE = { owner: PERSON, reviewer: PERSON }

/** Phase outputs and data-readiness items (US4, FR-015 to FR-017). */
@Injectable()
export class DeliverablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async add(
    input: {
      projectId: string
      phaseId: string
      title: string
      kind?: DeliverableKind | null
      ownerId?: string | null
      reviewerId?: string | null
      dueDate?: string | null
    },
    actorId: string,
  ): Promise<ProjectDeliverable> {
    await this.access.assertMember(input.projectId, actorId)
    const phase = await this.prisma.client.projectPhase.findUnique({ where: { id: input.phaseId } })
    if (!phase || phase.projectId !== input.projectId)
      throw new BadRequestException('The phase must belong to the same project')
    const row = await this.prisma.client.$transaction(async (tx) => {
      const count = await tx.projectDeliverable.count({ where: { phaseId: input.phaseId } })
      const created = await tx.projectDeliverable.create({
        data: {
          projectId: input.projectId,
          phaseId: input.phaseId,
          title: input.title.trim(),
          kind: input.kind ?? 'OUTPUT',
          ownerId: input.ownerId || null,
          reviewerId: input.reviewerId || null,
          dueDate: fromIsoDate(input.dueDate),
          order: count + 1,
        },
        include: INCLUDE,
      })
      await recordActivity(tx, {
        projectId: input.projectId,
        actorId,
        kind: 'DELIVERABLE_ADDED',
        targetType: 'deliverable',
        targetId: created.id,
        summary: `added deliverable ${created.title}`,
      })
      return created
    })
    return toDeliverable(row as unknown as DeliverableRow)
  }

  async update(
    input: {
      id: string
      title?: string | null
      ownerId?: string | null
      reviewerId?: string | null
      dueDate?: string | null
      status?: DeliverableStatus | null
      links?: { label: string; url: string }[] | null
    },
    actorId: string,
  ): Promise<ProjectDeliverable> {
    const current = await this.find(input.id)
    await this.access.assertMember(current.projectId, actorId)
    if (input.links && input.links.length > MAX_LINKS)
      throw new BadRequestException(`At most ${MAX_LINKS} links`)
    const row = await this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.projectDeliverable.update({
        where: { id: input.id },
        data: {
          ...(input.title != null ? { title: input.title.trim() } : {}),
          ...(input.ownerId !== undefined ? { ownerId: input.ownerId || null } : {}),
          ...(input.reviewerId !== undefined ? { reviewerId: input.reviewerId || null } : {}),
          ...(input.dueDate !== undefined ? { dueDate: fromIsoDate(input.dueDate) } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.links
            ? { links: input.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })) }
            : {}),
        },
        include: INCLUDE,
      })
      await recordActivity(tx, {
        projectId: current.projectId,
        actorId,
        kind: 'DELIVERABLE_UPDATED',
        targetType: 'deliverable',
        targetId: input.id,
        summary:
          input.status && input.status !== current.status
            ? `marked ${updated.title} as ${input.status.toLowerCase().replace('_', ' ')}`
            : `updated deliverable ${updated.title}`,
      })
      return updated
    })
    return toDeliverable(row as unknown as DeliverableRow)
  }

  /** FR-016 review outcome: the reviewer or a Manager. Approval marks it ready. */
  async review(
    input: { id: string; outcome: ReviewOutcome; note?: string | null },
    actorId: string,
  ): Promise<ProjectDeliverable> {
    const current = await this.find(input.id)
    const role = await this.access.assertMember(current.projectId, actorId)
    if (role !== 'MANAGER' && current.reviewerId !== actorId)
      throw new ForbiddenException(REVIEWER_ONLY)
    const row = await this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.projectDeliverable.update({
        where: { id: input.id },
        data: {
          reviewOutcome: input.outcome,
          reviewNote: input.note?.trim() || null,
          reviewedAt: new Date(),
          reviewerId: current.reviewerId ?? actorId,
          status: input.outcome === 'APPROVED' ? 'READY' : 'IN_PROGRESS',
        },
        include: INCLUDE,
      })
      await recordActivity(tx, {
        projectId: current.projectId,
        actorId,
        kind: 'DELIVERABLE_REVIEWED',
        targetType: 'deliverable',
        targetId: input.id,
        summary:
          input.outcome === 'APPROVED'
            ? `approved ${updated.title}`
            : `requested changes on ${updated.title}`,
      })
      return updated
    })
    return toDeliverable(row as unknown as DeliverableRow)
  }

  async remove(id: string, actorId: string): Promise<boolean> {
    const current = await this.find(id)
    await this.access.assertMember(current.projectId, actorId)
    await this.prisma.client.$transaction(async (tx) => {
      await tx.projectDeliverable.delete({ where: { id } })
      await recordActivity(tx, {
        projectId: current.projectId,
        actorId,
        kind: 'DELIVERABLE_REMOVED',
        targetType: 'deliverable',
        targetId: id,
        summary: `removed deliverable ${current.title}`,
      })
    })
    return true
  }

  private async find(id: string) {
    const row = await this.prisma.client.projectDeliverable.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Deliverable not found')
    return row
  }
}
