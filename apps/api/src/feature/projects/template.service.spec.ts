import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../../prisma/prisma.service.js'
import { TemplateService } from './template.service.js'

interface PhaseRow {
  id: string
  name: string
  description: string | null
  order: number
}
interface DelivRow {
  id: string
  templatePhaseId: string
  title: string
  kind: string
  order: number
}

function fakeDb() {
  let seq = 0
  const phases: PhaseRow[] = [
    { id: 'tpl_a', name: 'Kickoff', description: null, order: 1 },
    { id: 'tpl_b', name: 'Data Gathering', description: null, order: 2 },
  ]
  const deliverables: DelivRow[] = [
    { id: 'd_charter', templatePhaseId: 'tpl_a', title: 'Charter', kind: 'OUTPUT', order: 1 },
  ]
  const byId = (id: string) => phases.find((p) => p.id === id) ?? null
  const client = {
    templatePhase: {
      findMany: async () =>
        [...phases]
          .sort((a, b) => a.order - b.order)
          .map((p) => ({
            ...p,
            deliverables: deliverables
              .filter((d) => d.templatePhaseId === p.id)
              .sort((a, b) => a.order - b.order),
          })),
      findUnique: async ({ where }: { where: { id: string } }) => byId(where.id),
      create: async ({ data }: { data: Omit<PhaseRow, 'id'> }) => {
        const row = { id: `tpl_${++seq}`, ...data, description: data.description ?? null }
        phases.push(row)
        return row
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<PhaseRow> }) => {
        const row = byId(where.id)
        if (!row) throw new Error('missing')
        Object.assign(row, data)
        return row
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const i = phases.findIndex((p) => p.id === where.id)
        const [row] = phases.splice(i, 1)
        return row
      },
      count: async () => phases.length,
    },
    templateDeliverable: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        deliverables.find((d) => d.id === where.id) ?? null,
      findMany: async ({ where }: { where: { templatePhaseId: string } }) =>
        deliverables.filter((d) => d.templatePhaseId === where.templatePhaseId),
      create: async ({ data }: { data: Omit<DelivRow, 'id'> }) => {
        const row = { id: `d${++seq}`, ...data }
        deliverables.push(row)
        return row
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const i = deliverables.findIndex((d) => d.id === where.id)
        const [row] = deliverables.splice(i, 1)
        return row
      },
    },
  }
  return {
    phases,
    deliverables,
    client: {
      ...client,
      $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) => fn(client),
    },
  }
}

describe('TemplateService', () => {
  let db: ReturnType<typeof fakeDb>
  let svc: TemplateService

  beforeEach(async () => {
    db = fakeDb()
    const module = await Test.createTestingModule({
      providers: [TemplateService, { provide: PrismaService, useValue: { client: db.client } }],
    }).compile()
    svc = module.get(TemplateService)
  })

  it('lists phases in order with their deliverables', async () => {
    const list = await svc.list()
    expect(list.map((p) => p.name)).toEqual(['Kickoff', 'Data Gathering'])
    expect(list[0].deliverables.map((d) => d.title)).toEqual(['Charter'])
  })

  it('adds a phase at the end and updates names and descriptions', async () => {
    const added = await svc.addPhase({ name: '  Training ' })
    expect(added.order).toBe(3)
    expect(added.name).toBe('Training')
    const updated = await svc.updatePhase({
      id: 'tpl_a',
      name: 'Project kickoff',
      description: 'Align',
    })
    expect(updated.name).toBe('Project kickoff')
    expect(updated.description).toBe('Align')
    await expect(svc.updatePhase({ id: 'nope', name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('reorders phases by the given id list and renumbers from 1', async () => {
    const list = await svc.reorderPhases(['tpl_b', 'tpl_a'])
    expect(list.map((p) => [p.id, p.order])).toEqual([
      ['tpl_b', 1],
      ['tpl_a', 2],
    ])
    await expect(svc.reorderPhases(['tpl_a'])).rejects.toBeInstanceOf(BadRequestException)
  })

  it('removes a phase and its deliverables but keeps at least one phase', async () => {
    await svc.removePhase('tpl_b')
    expect(db.phases.map((p) => p.id)).toEqual(['tpl_a'])
    await expect(svc.removePhase('tpl_a')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('adds and removes suggested deliverables', async () => {
    const d = await svc.addDeliverable({
      templatePhaseId: 'tpl_a',
      title: 'Contacts',
      kind: 'DATA_CATEGORY',
    })
    expect(d.order).toBe(2)
    expect(d.kind).toBe('DATA_CATEGORY')
    await expect(
      svc.addDeliverable({ templatePhaseId: 'nope', title: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(await svc.removeDeliverable('d_charter')).toBe(true)
    await expect(svc.removeDeliverable('d_charter')).rejects.toBeInstanceOf(NotFoundException)
  })
})
