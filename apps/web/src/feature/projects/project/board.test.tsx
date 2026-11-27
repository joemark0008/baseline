import { MockedProvider } from '@apollo/client/testing/react'
import type { MockedResponse } from '@apollo/client/testing'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import type { ProjectData, WorkSearch } from '../lib'
import { MOVE_PROJECT_TASK } from '../operations'
import { ProjectBoardView } from './board'
import { ReadabilityProvider } from '../readability'
import { readViewPreference } from '../view-preferences'
import { ProjectContext } from './context'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const searchState: { search: WorkSearch; setSearch: ReturnType<typeof vi.fn> } = {
  search: {},
  setSearch: vi.fn(),
}
vi.mock('./work-search', () => ({ useWorkSearch: () => searchState }))

const person = { id: 'ada', name: 'Ada', email: 'ada@x.dev', image: null }
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()
const task = (
  id: string,
  position: number,
  owner: typeof person | null = null,
  over: Partial<ProjectData['phases'][number]['tasks'][number]> = {},
) => ({
  id,
  projectId: 'p1',
  phaseId: 'ph1',
  title: `Task ${id.toUpperCase()}`,
  description: null,
  owner,
  status: 'UPCOMING' as const,
  priority: 'MEDIUM' as const,
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
const project = {
  id: 'p1',
  name: 'Northstar',
  hospitalName: 'Northstar Hospital',
  description: null,
  status: 'ACTIVE',
  startDate: null,
  targetGoLiveDate: null,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  myRole: 'MEMBER',
  can: { manage: false, edit: true },
  summary: {
    totalTasks: 2,
    openTasks: 2,
    overdueTasks: 0,
    phaseCount: 1,
    completePhases: 0,
    progress: 0,
  },
  phases: [
    {
      id: 'ph1',
      name: 'Kickoff',
      description: null,
      order: 1,
      owner: null,
      startDate: null,
      endDate: null,
      status: 'UPCOMING',
      tasks: [
        task('a', 1, person),
        task('b', 2),
        task('old', 3, null, { status: 'COMPLETE', completedAt: daysAgo(30) }),
        task('fresh', 4, null, { status: 'COMPLETE', completedAt: daysAgo(2) }),
      ],
      deliverables: [],
    },
  ],
  members: [{ user: person, role: 'MEMBER', addedAt: '2026-11-01T00:00:00Z' }],
  stakeholders: [],
  pendingInvites: [],
} as unknown as ProjectData

function renderBoard(mocks: MockedResponse[] = []) {
  return render(
    <MockedProvider mocks={mocks}>
      <ProjectContext.Provider value={{ project, refetch: vi.fn() }}>
        <ReadabilityProvider projectId="p1" phaseIds={['ph1']}>
          <ProjectBoardView />
        </ReadabilityProvider>
      </ProjectContext.Provider>
    </MockedProvider>,
  )
}

describe('ProjectBoardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    searchState.search = {}
  })

  it('hides old completed work, keeps recent completions, and shows the rest on demand (US1)', async () => {
    renderBoard()
    const complete = within(screen.getByRole('list', { name: 'Complete tasks' }))
    expect(complete.getByText('Task FRESH')).toBeInTheDocument()
    expect(complete.queryByText('Task OLD')).not.toBeInTheDocument()
    expect(screen.getByText('1 done hidden')).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Show done (1)' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(complete.getByText('Task OLD')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide done' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByText('1 done hidden')).not.toBeInTheDocument()
  })

  it('lets a Complete status filter and a direct task link reveal hidden work (FR-004)', () => {
    searchState.search = { status: 'COMPLETE' }
    const first = renderBoard()
    const complete = within(screen.getByRole('list', { name: 'Complete tasks' }))
    expect(complete.getByText('Task OLD')).toBeInTheDocument()
    expect(screen.getByLabelText('2 of 2 tasks')).toBeInTheDocument()
    first.unmount()
    searchState.search = { task: 'old' }
    renderBoard()
    expect(
      within(screen.getByRole('list', { name: 'Complete tasks' })).getByText('Task OLD'),
    ).toBeInTheDocument()
  })

  it('narrows every column to the search text with matching of total (US2)', () => {
    searchState.search = { q: 'task a' }
    renderBoard()
    expect(screen.getByRole('searchbox', { name: 'Search tasks' })).toHaveValue('task a')
    expect(screen.getByLabelText('1 of 2 tasks')).toBeInTheDocument()
    expect(screen.getByLabelText('0 of 2 tasks')).toBeInTheDocument()
    const upcoming = within(screen.getByRole('list', { name: 'Upcoming tasks' }))
    expect(upcoming.queryByText('Task B')).not.toBeInTheDocument()
  })

  it('says when only hidden completed tasks match and offers to show them', async () => {
    searchState.search = { q: 'old' }
    renderBoard()
    const empty = screen.getByText('1 completed task matches.').closest('div')!
    await userEvent.click(within(empty).getByRole('button', { name: 'Show done' }))
    expect(
      within(screen.getByRole('list', { name: 'Complete tasks' })).getByText('Task OLD'),
    ).toBeInTheDocument()
  })

  it('switches to lanes by phase, remembers it, and narrows to the filtered phase (US4)', async () => {
    const first = renderBoard()
    const toggle = screen.getByRole('button', { name: 'Lanes by phase' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('region', { name: 'Kickoff lane' })).not.toBeInTheDocument()
    await userEvent.click(toggle)
    expect(screen.getByRole('region', { name: 'Kickoff lane' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse all' })).toBeInTheDocument()
    expect(readViewPreference('p1').boardLayout).toBe('lanes')
    first.unmount()
    searchState.search = { phase: 1 }
    const second = renderBoard()
    expect(screen.getByRole('button', { name: 'Lanes by phase' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getAllByRole('region', { name: /lane$/ })).toHaveLength(1)
    second.unmount()
    searchState.search = { phase: 2 }
    renderBoard()
    expect(screen.queryAllByRole('region', { name: /lane$/ })).toHaveLength(0)
  })

  it('explains an empty board and offers the fix', async () => {
    searchState.search = { owner: 'nobody' }
    renderBoard()
    expect(screen.getByText('No tasks match.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(searchState.setSearch).toHaveBeenCalledWith(
      expect.objectContaining({ owner: undefined }),
    )
  })

  it('narrows the cards to the shared filters', () => {
    searchState.search = { owner: 'ada' }
    renderBoard()
    const upcoming = within(screen.getByRole('list', { name: 'Upcoming tasks' }))
    expect(upcoming.getByText('Task A')).toBeInTheDocument()
    expect(upcoming.queryByText('Task B')).not.toBeInTheDocument()
  })

  it('restores the card and explains when a move is refused', async () => {
    renderBoard([
      {
        request: {
          query: MOVE_PROJECT_TASK,
          variables: {
            input: {
              id: 'b',
              status: 'IN_PROGRESS',
              phaseId: null,
              afterTaskId: null,
              beforeTaskId: null,
            },
          },
        },
        error: new Error('Project not found'),
      },
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Task B' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'In progress' }))
    expect(await screen.findByText('Project not found').catch(() => null)).toBeNull()
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Project not found'))
    const upcoming = within(screen.getByRole('list', { name: 'Upcoming tasks' }))
    expect(upcoming.getByText('Task B')).toBeInTheDocument()
  })

  it('opens a task through the shared search', async () => {
    renderBoard()
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Task A' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Open' }))
    expect(searchState.setSearch).toHaveBeenCalledWith({ task: 'a' })
  })
})
