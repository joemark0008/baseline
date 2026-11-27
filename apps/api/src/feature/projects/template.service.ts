import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { DeliverableKind } from './entities/enums.js'
import { TemplateDeliverable, TemplatePhase } from './entities/template.entity.js'

interface PhaseRow {
  id: string
  name: string
  description: string | null
  order: number
  deliverables?: DeliverableRow[]
}
interface DeliverableRow {
  id: string
  title: string
  kind: string
  order: number
}

/**
 * The standard implementation lifecycle (FR-002, FR-015). Administrators edit it; projects copy
 * it on creation, so a change here never touches an existing project.
 */
@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<TemplatePhase[]> {
    const rows = await this.prisma.client.templatePhase.findMany({
      orderBy: { order: 'asc' },
      include: { deliverables: { orderBy: { order: 'asc' } } },
    })
    return rows.map((r) => this.toPhase(r))
  }

  async addPhase(input: { name: string; description?: string | null }): Promise<TemplatePhase> {
    const order = (await this.prisma.client.templatePhase.count()) + 1
    const row = await this.prisma.client.templatePhase.create({
      data: { name: input.name.trim(), description: input.description?.trim() || null, order },
    })
    return this.toPhase({ ...row, deliverables: [] })
  }

  async updatePhase(input: {
    id: string
    name?: string | null
    description?: string | null
  }): Promise<TemplatePhase> {
    await this.findPhase(input.id)
    const row = await this.prisma.client.templatePhase.update({
      where: { id: input.id },
      data: {
        ...(input.name != null ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
      },
    })
    const deliverables = await this.prisma.client.templateDeliverable.findMany({
      where: { templatePhaseId: input.id },
      orderBy: { order: 'asc' },
    })
    return this.toPhase({ ...row, deliverables })
  }

  /** `ids` must name every phase exactly once; orders are renumbered from 1. */
  async reorderPhases(ids: string[]): Promise<TemplatePhase[]> {
    const current = await this.prisma.client.templatePhase.findMany({})
    const known = new Set(current.map((p) => p.id))
    if (
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !known.has(id))
    ) {
      throw new BadRequestException('Reorder must list every template phase exactly once')
    }
    await this.prisma.client.$transaction(async (tx) => {
      // Two passes keep the unique(order) constraint satisfied while rows swap places.
      for (const [i, id] of ids.entries()) {
        await tx.templatePhase.update({ where: { id }, data: { order: -(i + 1) } })
      }
      for (const [i, id] of ids.entries()) {
        await tx.templatePhase.update({ where: { id }, data: { order: i + 1 } })
      }
    })
    return this.list()
  }

  async removePhase(id: string): Promise<boolean> {
    await this.findPhase(id)
    if ((await this.prisma.client.templatePhase.count()) <= 1) {
      throw new BadRequestException('The template needs at least one phase')
    }
    await this.prisma.client.templatePhase.delete({ where: { id } })
    return true
  }

  async addDeliverable(input: {
    templatePhaseId: string
    title: string
    kind?: DeliverableKind | string | null
  }): Promise<TemplateDeliverable> {
    await this.findPhase(input.templatePhaseId)
    const siblings = await this.prisma.client.templateDeliverable.findMany({
      where: { templatePhaseId: input.templatePhaseId },
    })
    const row = await this.prisma.client.templateDeliverable.create({
      data: {
        templatePhaseId: input.templatePhaseId,
        title: input.title.trim(),
        kind: (input.kind ?? 'OUTPUT') as 'OUTPUT' | 'DATA_CATEGORY',
        order: siblings.length + 1,
      },
    })
    return this.toDeliverable(row)
  }

  async removeDeliverable(id: string): Promise<boolean> {
    const row = await this.prisma.client.templateDeliverable.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Template deliverable not found')
    await this.prisma.client.templateDeliverable.delete({ where: { id } })
    return true
  }

  private async findPhase(id: string): Promise<PhaseRow> {
    const row = await this.prisma.client.templatePhase.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Template phase not found')
    return row
  }

  private toPhase(row: PhaseRow): TemplatePhase {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      order: row.order,
      deliverables: (row.deliverables ?? []).map((d) => this.toDeliverable(d)),
    }
  }

  private toDeliverable(row: DeliverableRow): TemplateDeliverable {
    return { id: row.id, title: row.title, kind: row.kind as DeliverableKind, order: row.order }
  }
}
