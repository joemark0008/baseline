import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PhaseData, TaskData } from '../lib'
import { Board } from './Board'
import { cellId, cellOf } from './BoardColumn'

const task = (id: string, position: number, over: Partial<TaskData> = {}): TaskData => ({
  id,
  projectId: 'p1',
  phaseId: 'ph1',
  title: `Task ${id.toUpperCase()}`,
  description: null,
  owner: null,
  status: 'UPCOMING',
  priority: 'MEDIUM',
  startDate: null,
  dueDate: null,
  overdue: false,
  predecessor: null,
  position,
  predecessorConflict: false,
  completedAt: null,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...over,
})
const phases: PhaseData[] = [
  {
    id: 'ph1',
    name: 'Kickoff',
    description: null,
    order: 1,
    owner: null,
    startDate: null,
    endDate: null,
    status: 'UPCOMING',
    tasks: [],
    deliverables: [],
  },
]
const tasks = [
  task('a', 1, {
    owner: { id: 'ada', name: 'Ada Lovelace', email: 'a@x', image: null },
    priority: 'HIGH',
  }),
  task('b', 2, { dueDate: '2020-01-01', overdue: true }),
  task('c', 3, { status: 'IN_PROGRESS' }),
]

describe('Board', () => {
  it('renders the four columns in order with counts and card essentials', () => {
    render(<Board tasks={tasks} phases={phases} canEdit onMove={vi.fn()} onOpen={vi.fn()} />)
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['Upcoming', 'In progress', 'Blocked', 'Complete'])
    expect(screen.getByLabelText('2 tasks')).toBeInTheDocument()
    const upcoming = within(screen.getByRole('list', { name: 'Upcoming tasks' }))
    expect(upcoming.getAllByRole('listitem')).toHaveLength(2)
    expect(upcoming.getByText('Task A')).toBeInTheDocument()
    expect(upcoming.getByLabelText('Ada Lovelace')).toBeInTheDocument()
    expect(upcoming.getByText('High')).toBeInTheDocument()
    expect(upcoming.getAllByText('Kickoff')).toHaveLength(2)
    expect(upcoming.getByText(/Due 1 Jan · Overdue/)).toHaveClass('text-destructive')
  })

  it('offers menu equivalents for moving between columns and reordering', async () => {
    const onMove = vi.fn()
    render(<Board tasks={tasks} phases={phases} canEdit onMove={onMove} onOpen={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Task A' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'In progress' }))
    expect(onMove).toHaveBeenLastCalledWith({ id: 'a', status: 'IN_PROGRESS', afterTaskId: 'c' })
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Task A' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Move down' }))
    expect(onMove).toHaveBeenLastCalledWith({ id: 'a', afterTaskId: 'b' })
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Task B' }))
    expect(await screen.findByRole('menuitem', { name: 'Move down' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('opens a task from its menu and hides handles and moves when editing is not allowed', async () => {
    const onOpen = vi.fn()
    render(<Board tasks={tasks} phases={phases} canEdit={false} onMove={vi.fn()} onOpen={onOpen} />)
    expect(screen.queryByLabelText('Drag to reorder Task A')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Task A' }))
    expect(screen.queryByRole('menuitem', { name: 'In progress' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Open' }))
    expect(onOpen).toHaveBeenCalledWith('a')
  })

  it('exposes keyboard-operable drag handles with instructions', () => {
    render(<Board tasks={tasks} phases={phases} canEdit onMove={vi.fn()} onOpen={vi.fn()} />)
    const handle = screen.getByLabelText('Drag to reorder Task A')
    expect(handle).toHaveAttribute('tabindex', '0')
    expect(handle).toHaveAttribute('aria-roledescription', 'sortable')
    expect(handle).toHaveAttribute('aria-describedby')
  })

  describe('lanes by phase (feature 011)', () => {
    const build: PhaseData = { ...phases[0], id: 'ph2', name: 'Build', order: 2 }
    const empty: PhaseData = { ...phases[0], id: 'ph3', name: 'Go-live', order: 3 }
    const laneTasks = [
      ...tasks,
      task('d', 4, { phaseId: 'ph2', status: 'IN_PROGRESS' }),
      task('e', 5, { phaseId: 'ph2', status: 'COMPLETE', completedAt: '2026-10-01T00:00:00Z' }),
    ]
    const folding = (collapsed: string[] = []) => ({
      isCollapsed: (id: string) => collapsed.includes(id),
      toggle: vi.fn(),
      collapseAll: vi.fn(),
      expandAll: vi.fn(),
    })

    it('parses cell ids', () => {
      expect(cellOf(cellId('ph1', 'IN_PROGRESS'))).toEqual({
        phaseId: 'ph1',
        status: 'IN_PROGRESS',
      })
      expect(cellOf('column:UPCOMING')).toBeNull()
      expect(cellOf('cell:ph1:NOPE')).toBeNull()
    })

    it('renders one lane per phase in plan order with four cells each, empty phases included', () => {
      render(
        <Board
          tasks={laneTasks}
          phases={[empty, build, phases[0]]}
          layout="lanes"
          folding={folding()}
          canEdit
          onMove={vi.fn()}
          onOpen={vi.fn()}
        />,
      )
      const lanes = screen.getAllByRole('region', { name: /lane$/ })
      expect(lanes.map((l) => l.getAttribute('aria-label'))).toEqual([
        'Kickoff lane',
        'Build lane',
        'Go-live lane',
      ])
      for (const lane of lanes)
        expect(
          within(lane)
            .getAllByRole('heading', { level: 3 })
            .map((h) => h.textContent),
        ).toEqual([expect.any(String), 'Upcoming', 'In progress', 'Blocked', 'Complete'])
      expect(within(lanes[1]).getByText('1 done')).toBeInTheDocument()
      expect(within(lanes[1]).getByLabelText('1 open in Build')).toBeInTheDocument()
      expect(within(lanes[2]).getAllByRole('list')).toHaveLength(4)
    })

    it('moves a card to another phase from its menu with full-order neighbours', async () => {
      const onMove = vi.fn()
      render(
        <Board
          tasks={laneTasks.filter((t) => t.status !== 'COMPLETE')}
          allTasks={laneTasks}
          phases={[phases[0], build]}
          layout="lanes"
          canEdit
          onMove={onMove}
          onOpen={vi.fn()}
        />,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Actions for Task A' }))
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Build' }))
      expect(onMove).toHaveBeenLastCalledWith({ id: 'a', phaseId: 'ph2' })
      await userEvent.click(screen.getByRole('button', { name: 'Actions for Task C' }))
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Complete' }))
      expect(onMove).toHaveBeenLastCalledWith({ id: 'c', status: 'COMPLETE' })
      await userEvent.click(screen.getByRole('button', { name: 'Actions for Task D' }))
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Complete' }))
      expect(onMove).toHaveBeenLastCalledWith({ id: 'd', status: 'COMPLETE', afterTaskId: 'e' })
    })

    it('folds a lane to its header and compact cells through the shared state', async () => {
      const f = folding(['ph2'])
      render(
        <Board
          tasks={laneTasks}
          phases={[phases[0], build]}
          layout="lanes"
          folding={f}
          canEdit
          onMove={vi.fn()}
          onOpen={vi.fn()}
        />,
      )
      const lane = screen.getByRole('region', { name: 'Build lane' })
      expect(within(lane).queryAllByRole('listitem')).toHaveLength(0)
      expect(within(lane).getAllByRole('heading', { level: 3 })).toHaveLength(5)
      const toggle = within(lane).getByRole('button', { name: 'Expand Build' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(toggle)
      expect(f.toggle).toHaveBeenCalledWith('ph2')
      expect(
        within(screen.getByRole('region', { name: 'Kickoff lane' })).getAllByRole('listitem'),
      ).toHaveLength(3)
    })
  })
})
