import { MockedProvider } from '@apollo/client/testing/react'
import type { MockedResponse } from '@apollo/client/testing'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import type { ProjectData, WorkSearch } from '../lib'
import { MOVE_PROJECT_TASK } from '../operations'
import { ProjectBoardView } from './board'
import { ProjectContext } from './context'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const searchState: { search: WorkSearch; setSearch: ReturnType<typeof vi.fn> } = {
  search: {},
  setSearch: vi.fn(),
}
vi.mock('./work-search', () => ({ useWorkSearch: () => searchState }))

const person = { id: 'ada', name: 'Ada', email: 'ada@x.dev', image: null }
const task = (id: string, position: number, owner: typeof person | null = null) => ({
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
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
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
      tasks: [task('a', 1, person), task('b', 2)],
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
        <ProjectBoardView />
      </ProjectContext.Provider>
    </MockedProvider>,
  )
}

describe('ProjectBoardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchState.search = {}
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
