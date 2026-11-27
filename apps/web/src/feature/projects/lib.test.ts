import {
  columnsByStatus,
  deltaToDays,
  doneCountByPhase,
  emptyReason,
  formatDate,
  groupByPhase,
  hiddenDoneCount,
  initials,
  isRecentlyDone,
  label,
  matchCounts,
  neighboursFor,
  normaliseText,
  orderByPosition,
  parseWorkSearch,
  phaseAt,
  phaseNumber,
  provisionalPosition,
  resizeDate,
  shiftDates,
  visibleTasks,
  workSortOf,
  type PhaseData,
  type TaskData,
  type VisibleContext,
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
  completedAt: null,
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

  it('filters by phase number, owner, status and overdue', () => {
    const phases = [phase('ph2', 2), phase('ph1', 1)]
    const ctx = (search: VisibleContext['search']): VisibleContext => ({
      search,
      phases,
      userId: null,
      showDone: true,
    })
    expect(visibleTasks(tasks, ctx({ phase: 2 })).map((x) => x.id)).toEqual(['c'])
    expect(visibleTasks(tasks, ctx({ phase: 1 }))).toHaveLength(3)
    expect(visibleTasks(tasks, ctx({ phase: 9 }))).toEqual([])
    expect(visibleTasks(tasks, ctx({ owner: 'ada' })).map((x) => x.id)).toEqual(['d'])
    expect(visibleTasks(tasks, ctx({ status: 'IN_PROGRESS' })).map((x) => x.id)).toEqual(['a'])
    expect(visibleTasks(tasks, ctx({ overdue: true })).map((x) => x.id)).toEqual(['c'])
    expect(visibleTasks(tasks, ctx({}))).toHaveLength(4)
  })

  it('numbers phases by plan order, not by id', () => {
    const phases = [phase('ph2', 2), phase('ph1', 1)]
    expect(phaseNumber(phases, 'ph2')).toBe(2)
    expect(phaseNumber(phases, 'nope')).toBe(0)
    expect(phaseAt(phases, 1)?.id).toBe('ph1')
    expect(phaseAt(phases, 3)).toBeNull()
  })

  it('parses search params, dropping unknown values and the default sort', () => {
    expect(
      parseWorkSearch({
        phase: '2',
        owner: '',
        status: 'NOPE',
        overdue: 'true',
        sort: 'due',
        task: 't9',
        q: ' lab ',
        mine: 'true',
      }),
    ).toEqual({ phase: 2, overdue: true, sort: 'due', task: 't9', q: 'lab', mine: true })
    expect(parseWorkSearch({ q: '   ', mine: 'yes' })).toEqual({})
    expect(parseWorkSearch({ q: 'x'.repeat(120), mine: true }).q).toHaveLength(100)
    expect(parseWorkSearch({ phase: 3 })).toEqual({ phase: 3 })
    expect(parseWorkSearch({ phase: 'cmwy97nzq0001' })).toEqual({})
    expect(parseWorkSearch({ phase: 0 })).toEqual({})
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

describe('readability (feature 011)', () => {
  const now = new Date('2026-11-27T10:00:00Z')
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString()
  const phases = [phase('ph1', 1), phase('ph2', 2)]
  const done = (id: string, over: Partial<TaskData> = {}) =>
    t(id, { status: 'COMPLETE', completedAt: daysAgo(30), ...over })
  const tasks = [
    t('open1', {
      title: 'Validate lab orders',
      owner: { id: 'ada', name: 'Ada Lovelace', email: 'ada@x.dev', image: null },
    }),
    t('open2', { title: 'Éducation des infirmières', phaseId: 'ph2' }),
    done('old1'),
    done('old2', { phaseId: 'ph2', title: 'Lab interface' }),
    done('fresh', { completedAt: daysAgo(2) }),
  ]
  const ctx = (over: Partial<VisibleContext> = {}): VisibleContext => ({
    search: {},
    phases,
    userId: 'ada',
    showDone: false,
    now,
    ...over,
  })
  const ids = (list: TaskData[]) => list.map((x) => x.id)

  it('normalises case and accents', () => {
    expect(normaliseText('Éducation ')).toBe('education')
    expect(normaliseText('LAB Orders')).toBe('lab orders')
  })

  it('treats a completion within seven days as recent', () => {
    expect(isRecentlyDone(done('x', { completedAt: daysAgo(6.95) }), now)).toBe(true)
    expect(isRecentlyDone(done('x', { completedAt: daysAgo(7.05) }), now)).toBe(false)
    expect(isRecentlyDone(t('x', { completedAt: daysAgo(1) }), now)).toBe(false)
    expect(isRecentlyDone(done('x', { completedAt: null }), now)).toBe(false)
  })

  it('hides done tasks unless shown, filtered to Complete, opened, or recent on the Board', () => {
    expect(ids(visibleTasks(tasks, ctx()))).toEqual(['open1', 'open2'])
    expect(ids(visibleTasks(tasks, ctx({ recentDoneVisible: true })))).toEqual([
      'open1',
      'open2',
      'fresh',
    ])
    expect(ids(visibleTasks(tasks, ctx({ showDone: true })))).toHaveLength(5)
    expect(ids(visibleTasks(tasks, ctx({ search: { status: 'COMPLETE' } })))).toEqual([
      'old1',
      'old2',
      'fresh',
    ])
    expect(ids(visibleTasks(tasks, ctx({ search: { task: 'old1' } })))).toEqual([
      'open1',
      'open2',
      'old1',
    ])
  })

  it('narrows to mine and to the search text on title or owner name', () => {
    expect(ids(visibleTasks(tasks, ctx({ search: { mine: true } })))).toEqual(['open1'])
    expect(ids(visibleTasks(tasks, ctx({ search: { mine: true }, userId: null })))).toEqual([])
    expect(ids(visibleTasks(tasks, ctx({ search: { q: 'LAB' } })))).toEqual(['open1'])
    expect(ids(visibleTasks(tasks, ctx({ search: { q: 'lovelace' } })))).toEqual(['open1'])
    expect(ids(visibleTasks(tasks, ctx({ search: { q: 'education' } })))).toEqual(['open2'])
    expect(ids(visibleTasks(tasks, ctx({ search: { q: 'lab' }, showDone: true })))).toEqual([
      'open1',
      'old2',
    ])
  })

  it('counts done work per phase and what a view hides', () => {
    expect([...doneCountByPhase(tasks)]).toEqual([
      ['ph1', 2],
      ['ph2', 1],
    ])
    expect(hiddenDoneCount(tasks, visibleTasks(tasks, ctx()))).toBe(3)
    expect(hiddenDoneCount(tasks, visibleTasks(tasks, ctx({ recentDoneVisible: true })))).toBe(2)
    expect(hiddenDoneCount(tasks, visibleTasks(tasks, ctx({ showDone: true })))).toBe(0)
  })

  it('reports matching of total per container', () => {
    const visible = visibleTasks(tasks, ctx({ search: { q: 'lab' }, showDone: true }))
    expect([...matchCounts(visible, tasks, (x) => x.phaseId)]).toEqual([
      ['ph1', { matching: 1, total: 3 }],
      ['ph2', { matching: 1, total: 2 }],
    ])
  })

  it('explains an empty view', () => {
    const reason = (all: TaskData[], over: Partial<VisibleContext> = {}) =>
      emptyReason(all, visibleTasks(all, ctx(over)), ctx(over))
    expect(reason(tasks)).toBeNull()
    expect(reason([])).toBe('none')
    expect(reason([done('a'), done('b')])).toBe('all-done')
    expect(reason(tasks, { search: { q: 'zzz' } })).toBe('no-match')
    expect(reason(tasks, { search: { q: 'interface' } })).toBe('only-done-match')
    expect(reason(tasks, { search: { q: 'interface' }, showDone: true })).toBeNull()
  })
})
