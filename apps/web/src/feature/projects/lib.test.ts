import {
  applyWorkFilters,
  columnsByStatus,
  deltaToDays,
  formatDate,
  groupByPhase,
  initials,
  label,
  neighboursFor,
  orderByPosition,
  parseWorkSearch,
  provisionalPosition,
  resizeDate,
  shiftDates,
  workSortOf,
  type PhaseData,
  type TaskData,
} from './lib'

describe('project helpers', () => {
  it('formats calendar dates without a time-zone shift', () => {
    expect(formatDate('2026-12-03')).toBe('3 Dec 2026')
    expect(formatDate('2026-12-03', false)).toBe('3 Dec')
    expect(formatDate(null)).toBe('—')
  })

  it('labels enum values for people', () => {
    expect(label('IN_PROGRESS')).toBe('In progress')
    expect(label('DATA_CATEGORY')).toBe('Data category')
    expect(label(null)).toBe('—')
  })

  it('builds initials from a name', () => {
    expect(initials('Amina Yusuf')).toBe('AY')
    expect(initials('Bo')).toBe('B')
  })
})

const t = (id: string, over: Partial<TaskData> = {}): TaskData => ({
  id,
  projectId: 'p1',
  phaseId: 'ph1',
  title: id.toUpperCase(),
  description: null,
  owner: null,
  status: 'UPCOMING',
  priority: 'MEDIUM',
  startDate: null,
  dueDate: null,
  overdue: false,
  predecessor: null,
  position: 0,
  predecessorConflict: false,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...over,
})
const phase = (id: string, order: number): PhaseData => ({
  id,
  name: id,
  description: null,
  order,
  owner: null,
  startDate: null,
  endDate: null,
  status: 'UPCOMING',
  tasks: [],
  deliverables: [],
})

describe('work views (feature 010)', () => {
  const tasks = [
    t('a', { position: 3, status: 'IN_PROGRESS' }),
    t('b', { position: 1, dueDate: '2026-12-20' }),
    t('c', { position: 2, phaseId: 'ph2', dueDate: '2026-12-01', overdue: true }),
    t('d', {
      position: 2,
      createdAt: '2026-10-01T00:00:00Z',
      owner: { id: 'ada', name: 'Ada', email: 'a@x', image: null },
    }),
  ]

  it('orders by position with creation time as the tie-break', () => {
    expect(orderByPosition(tasks).map((x) => x.id)).toEqual(['b', 'd', 'c', 'a'])
  })

  it('builds the four board columns in order', () => {
    const cols = columnsByStatus(tasks)
    expect(cols.map((c) => c.status)).toEqual(['UPCOMING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE'])
    expect(cols[0].tasks.map((x) => x.id)).toEqual(['b', 'd', 'c'])
    expect(cols[1].tasks.map((x) => x.id)).toEqual(['a'])
    expect(cols[2].tasks).toEqual([])
  })

  it('groups by phase in plan order and honours the sort', () => {
    const phases = [phase('ph2', 2), phase('ph1', 1)]
    const groups = groupByPhase(tasks, phases)
    expect(groups.map((g) => g.phase.id)).toEqual(['ph1', 'ph2'])
    expect(groups[0].tasks.map((x) => x.id)).toEqual(['b', 'd', 'a'])
    expect(groupByPhase(tasks, phases, 'due')[0].tasks.map((x) => x.id)).toEqual(['b', 'a', 'd'])
    expect(groupByPhase(tasks, phases, 'title')[0].tasks.map((x) => x.id)).toEqual(['a', 'b', 'd'])
  })

  it('filters by phase, owner, status and overdue', () => {
    expect(applyWorkFilters(tasks, { phase: 'ph2' }).map((x) => x.id)).toEqual(['c'])
    expect(applyWorkFilters(tasks, { owner: 'ada' }).map((x) => x.id)).toEqual(['d'])
    expect(applyWorkFilters(tasks, { status: 'IN_PROGRESS' }).map((x) => x.id)).toEqual(['a'])
    expect(applyWorkFilters(tasks, { overdue: true }).map((x) => x.id)).toEqual(['c'])
    expect(applyWorkFilters(tasks, {})).toHaveLength(4)
  })

  it('parses search params, dropping unknown values and the default sort', () => {
    expect(
      parseWorkSearch({
        phase: 'ph1',
        owner: '',
        status: 'NOPE',
        overdue: 'true',
        sort: 'due',
        task: 't9',
      }),
    ).toEqual({ phase: 'ph1', overdue: true, sort: 'due', task: 't9' })
    expect(parseWorkSearch({ sort: 'manual', overdue: false })).toEqual({})
    expect(workSortOf({})).toBe('manual')
  })

  it('names the neighbours of a drop inside and across containers', () => {
    const ids = ['a', 'b', 'c', 'd']
    expect(neighboursFor(ids, 'a', 'c')).toEqual({ afterTaskId: 'c', beforeTaskId: 'd' })
    expect(neighboursFor(ids, 'd', 'b')).toEqual({ afterTaskId: 'a', beforeTaskId: 'b' })
    expect(neighboursFor(ids, 'a', null)).toEqual({ afterTaskId: 'd' })
    expect(neighboursFor(ids, 'a', 'a')).toEqual({ afterTaskId: 'd' })
    expect(neighboursFor(['x', 'y'], 'a', 'y')).toEqual({ afterTaskId: 'x', beforeTaskId: 'y' })
    expect(neighboursFor(['x', 'y'], 'a', 'x')).toEqual({ beforeTaskId: 'x' })
    expect(neighboursFor([], 'a', null)).toEqual({})
  })

  it('estimates a provisional position from the neighbours', () => {
    const rows = [
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
    ]
    expect(provisionalPosition(rows, { afterTaskId: 'a', beforeTaskId: 'b' })).toBe(1.5)
    expect(provisionalPosition(rows, { afterTaskId: 'b' })).toBe(3)
    expect(provisionalPosition(rows, { beforeTaskId: 'a' })).toBe(0)
    expect(provisionalPosition(rows, {})).toBe(3)
    expect(provisionalPosition([], {})).toBe(1)
  })
})

describe('timeline geometry (feature 010)', () => {
  it('rounds a pixel delta to whole days', () => {
    expect(deltaToDays(0, 10)).toBe(0)
    expect(deltaToDays(14, 10)).toBe(1)
    expect(deltaToDays(-16, 10)).toBe(-2)
    expect(deltaToDays(50, 0)).toBe(0)
  })

  it('shifts both dates, or only the due date when there is no start', () => {
    expect(shiftDates({ startDate: '2026-12-01', dueDate: '2026-12-10' }, 14)).toEqual({
      startDate: '2026-12-15',
      dueDate: '2026-12-24',
    })
    expect(shiftDates({ startDate: null, dueDate: '2026-12-31' }, 1)).toEqual({
      startDate: null,
      dueDate: '2027-01-01',
    })
    const same = { startDate: '2026-12-01', dueDate: null }
    expect(shiftDates(same, 0)).toBe(same)
  })

  it('resizes one edge at a time', () => {
    const range = { startDate: '2026-12-01', dueDate: '2026-12-10' }
    expect(resizeDate(range, 'due', -3)).toEqual({ startDate: '2026-12-01', dueDate: '2026-12-07' })
    expect(resizeDate(range, 'start', 2)).toEqual({
      startDate: '2026-12-03',
      dueDate: '2026-12-10',
    })
    expect(resizeDate({ startDate: null, dueDate: '2026-12-10' }, 'start', 2).startDate).toBeNull()
  })
})
