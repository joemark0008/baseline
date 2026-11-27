import { predecessorConflict, toListItem, toTask } from './mappers.js'

const base = {
  id: 't1',
  projectId: 'p1',
  phaseId: 'ph1',
  title: 'Validate workflows',
  description: null,
  owner: null,
  status: 'UPCOMING',
  priority: 'MEDIUM',
  startDate: new Date('2026-12-10T00:00:00Z'),
  dueDate: new Date('2026-12-20T00:00:00Z'),
  predecessor: null as { id: string; title: string; dueDate?: Date | null } | null,
  position: 3,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  updatedAt: new Date('2026-11-01T00:00:00Z'),
}

describe('mappers (feature 010)', () => {
  it('flags a task that starts before its predecessor is due, and only then', () => {
    const pred = { id: 't0', title: 'Earlier', dueDate: new Date('2026-12-15T00:00:00Z') }
    expect(predecessorConflict({ ...base, predecessor: pred })).toBe(true)
    expect(
      predecessorConflict({ ...base, predecessor: { ...pred, dueDate: new Date('2026-12-10') } }),
    ).toBe(false)
    expect(predecessorConflict({ ...base, predecessor: { ...pred, dueDate: null } })).toBe(false)
    expect(predecessorConflict({ ...base, startDate: null, predecessor: pred })).toBe(false)
    expect(predecessorConflict({ ...base, predecessor: null })).toBe(false)
  })

  it('carries position and the conflict flag onto the task', () => {
    const task = toTask({
      ...base,
      predecessor: { id: 't0', title: 'Earlier', dueDate: new Date('2026-12-15T00:00:00Z') },
    })
    expect(task.position).toBe(3)
    expect(task.predecessorConflict).toBe(true)
    expect(toTask({ ...base, position: undefined }).position).toBe(0)
  })

  it('carries completedAt and defaults it to null (feature 011)', () => {
    const at = new Date('2026-11-20T08:00:00Z')
    expect(toTask({ ...base, status: 'COMPLETE', completedAt: at }).completedAt).toBe(at)
    expect(toTask(base).completedAt).toBeNull()
  })

  it('maps the filtered relation count to myOpenTasks', () => {
    const row = {
      id: 'p1',
      name: 'Northstar',
      hospitalName: 'Northstar Hospital',
      status: 'ACTIVE',
      startDate: null,
      targetGoLiveDate: null,
      updatedAt: new Date(),
      phases: [],
      tasks: [],
      members: [{ role: 'MANAGER' }],
    }
    expect(toListItem({ ...row, _count: { tasks: 4 } }).myOpenTasks).toBe(4)
    expect(toListItem(row).myOpenTasks).toBe(0)
  })
})
