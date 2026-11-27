import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PhaseData, TaskData } from '../lib'
import { Board } from './Board'

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
})
