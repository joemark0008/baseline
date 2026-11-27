import { MockedProvider } from '@apollo/client/testing/react'
import type { MockedResponse } from '@apollo/client/testing'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PhaseData, TaskData } from '../lib'
import { CREATE_PROJECT_TASK } from '../operations'
import { TaskList, type TaskListProps } from './TaskList'

const person = { id: 'ada', name: 'Ada', email: 'ada@x.dev', image: null }
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
const phase = (id: string, name: string, order: number): PhaseData => ({
  id,
  name,
  description: null,
  order,
  owner: null,
  startDate: null,
  endDate: null,
  status: 'UPCOMING',
  tasks: [],
  deliverables: [],
})
const phases = [phase('ph2', 'Data Gathering', 2), phase('ph1', 'Kickoff', 1)]
const tasks = [
  task('a', 1),
  task('b', 2, { dueDate: '2026-12-01' }),
  task('c', 3, { phaseId: 'ph2' }),
]

function renderList(over: Partial<TaskListProps> = {}, mocks: MockedResponse[] = []) {
  const props: TaskListProps = {
    projectId: 'p1',
    tasks,
    phases,
    members: [person],
    canEdit: true,
    sort: 'manual',
    onMove: vi.fn(),
    onOpen: vi.fn(),
    onInlineChange: vi.fn(),
    onResetSort: vi.fn(),
    ...over,
  }
  render(
    <MockedProvider mocks={mocks}>
      <TaskList {...props} />
    </MockedProvider>,
  )
  return props
}

describe('TaskList', () => {
  it('shows done and overdue figures and resolves drops against the full order (feature 011)', async () => {
    const hidden = [
      task('z', 4, { status: 'COMPLETE', completedAt: '2026-10-01T00:00:00Z' }),
      task('zz', 5, { status: 'COMPLETE', phaseId: 'ph2', completedAt: '2026-10-01T00:00:00Z' }),
    ]
    const visible = [
      task('a', 1),
      task('b', 2, { overdue: true }),
      task('c', 3, { phaseId: 'ph2' }),
    ]
    const { onMove } = renderList({
      tasks: visible,
      allTasks: [...visible, ...hidden],
      doneCounts: new Map([['ph1', 1]]),
    })
    const kickoff = screen.getAllByRole('region')[0]
    expect(within(kickoff).getByText('1 done')).toBeInTheDocument()
    expect(within(kickoff).getByText('1 overdue')).toBeInTheDocument()
    expect(within(kickoff).getAllByRole('row')).toHaveLength(3)
    expect(within(screen.getAllByRole('region')[1]).getByText('0 done')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Task A' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Data Gathering' }))
    expect(onMove).toHaveBeenLastCalledWith({ id: 'a', phaseId: 'ph2', afterTaskId: 'zz' })
  })

  it('folds phases through the shared state and keeps their figures and drop target (US3)', async () => {
    const collapsed = new Set(['ph1'])
    const folding = {
      isCollapsed: (id: string) => collapsed.has(id),
      toggle: vi.fn(),
      collapseAll: vi.fn(),
      expandAll: vi.fn(),
    }
    renderList({ folding, doneCounts: new Map([['ph1', 2]]) })
    const [kickoff, gathering] = screen.getAllByRole('region')
    expect(within(kickoff).queryByRole('table')).not.toBeInTheDocument()
    expect(within(kickoff).getByText('2 done')).toBeInTheDocument()
    expect(within(kickoff).getByLabelText('2 tasks in Kickoff')).toBeInTheDocument()
    expect(within(kickoff).getByRole('button', { name: /Kickoff/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(within(gathering).getByRole('table')).toBeInTheDocument()
    await userEvent.click(within(kickoff).getByRole('button', { name: /Kickoff/ }))
    expect(folding.toggle).toHaveBeenCalledWith('ph1')
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(folding.collapseAll).toHaveBeenCalledWith(['ph1', 'ph2'])
    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(folding.expandAll).toHaveBeenCalled()
  })

  it('shows matching of total while filtering', () => {
    renderList({ tasks: [tasks[0]], allTasks: tasks, filtered: true })
    expect(screen.getByLabelText('1 of 2 tasks in Kickoff')).toBeInTheDocument()
    expect(screen.getByLabelText('0 of 1 tasks in Data Gathering')).toBeInTheDocument()
  })

  it('groups tasks by phase in plan order with counts and collapsible groups', async () => {
    renderList()
    const groups = screen.getAllByRole('region')
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['Kickoff', 'Data Gathering'])
    expect(screen.getByLabelText('2 tasks in Kickoff')).toBeInTheDocument()
    expect(screen.getByLabelText('1 tasks in Data Gathering')).toBeInTheDocument()
    expect(within(groups[0]).getAllByRole('row')).toHaveLength(3)
    await userEvent.click(within(groups[0]).getByRole('button', { name: /Kickoff/ }))
    expect(within(groups[0]).queryByRole('table')).not.toBeInTheDocument()
  })

  it('moves a task to another phase or up and down from its menu', async () => {
    const { onMove } = renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Task A' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Data Gathering' }))
    expect(onMove).toHaveBeenLastCalledWith({ id: 'a', phaseId: 'ph2', afterTaskId: 'c' })
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Task A' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Move down' }))
    expect(onMove).toHaveBeenLastCalledWith({ id: 'a', afterTaskId: 'b' })
  })

  it('saves inline edits through onInlineChange', async () => {
    const { onInlineChange } = renderList()
    await userEvent.selectOptions(screen.getByLabelText('Status for Task A'), 'IN_PROGRESS')
    expect(onInlineChange).toHaveBeenCalledWith('a', { status: 'IN_PROGRESS' })
    await userEvent.selectOptions(screen.getByLabelText('Owner for Task A'), 'ada')
    expect(onInlineChange).toHaveBeenCalledWith('a', { ownerId: 'ada' })
    await userEvent.selectOptions(screen.getByLabelText('Priority for Task B'), 'HIGH')
    expect(onInlineChange).toHaveBeenCalledWith('b', { priority: 'HIGH' })
  })

  it('explains that dragging needs manual order and offers to switch back', async () => {
    const { onResetSort } = renderList({ sort: 'due' })
    expect(screen.queryByLabelText('Drag to reorder Task A')).not.toBeInTheDocument()
    expect(screen.getByText(/needs manual order/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Use manual order' }))
    expect(onResetSort).toHaveBeenCalled()
  })

  it('quick-adds a task into its phase and keeps the field ready', async () => {
    let created = false
    renderList({}, [
      {
        request: {
          query: CREATE_PROJECT_TASK,
          variables: { input: { projectId: 'p1', phaseId: 'ph2', title: 'Collect forms' } },
        },
        result: () => {
          created = true
          return { data: { createProjectTask: { id: 'new', title: 'Collect forms' } } }
        },
      },
    ])
    const input = screen.getByLabelText('Add a task to Data Gathering')
    await userEvent.type(input, 'Collect forms{Enter}')
    await vi.waitFor(() => expect(created).toBe(true))
    await vi.waitFor(() => expect(input).toHaveValue(''))
    expect(input).toHaveFocus()
  })

  it('renders read-only rows for viewers who cannot edit', () => {
    renderList({ canEdit: false })
    expect(screen.queryByLabelText('Drag to reorder Task A')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Add a task to Kickoff')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Status for Task A')).toBeDisabled()
  })
})
