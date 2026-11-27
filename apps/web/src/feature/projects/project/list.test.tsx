import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ProjectData, WorkSearch } from '../lib'
import { ReadabilityProvider } from '../readability'
import { readViewPreference, writeViewPreference } from '../view-preferences'
import { ProjectContext } from './context'
import { ProjectListView } from './list'

const searchState: { search: WorkSearch; setSearch: ReturnType<typeof vi.fn> } = {
  search: {},
  setSearch: vi.fn(),
}
vi.mock('./work-search', () => ({ useWorkSearch: () => searchState }))

const phase = (id: string, name: string, order: number) => ({
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
const project = {
  id: 'p1',
  name: 'Northstar',
  hospitalName: 'Northstar Hospital',
  status: 'ACTIVE',
  myRole: 'MEMBER',
  can: { manage: false, edit: true },
  summary: {
    totalTasks: 0,
    openTasks: 0,
    overdueTasks: 0,
    phaseCount: 2,
    completePhases: 0,
    progress: 0,
  },
  phases: [phase('ph2', 'Build', 2), phase('ph1', 'Kickoff', 1)],
  members: [],
  stakeholders: [],
  pendingInvites: [],
} as unknown as ProjectData

const renderList = () =>
  render(
    <MockedProvider mocks={[]}>
      <ProjectContext.Provider value={{ project, refetch: vi.fn() }}>
        <ReadabilityProvider projectId="p1" phaseIds={['ph1', 'ph2']}>
          <ProjectListView />
        </ReadabilityProvider>
      </ProjectContext.Provider>
    </MockedProvider>,
  )

describe('ProjectListView (feature 011)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    searchState.search = {}
  })

  it('unfolds the first phase and focuses its quick-add on the n shortcut (FR-015)', async () => {
    writeViewPreference('p1', { collapsed: ['ph1'] })
    renderList()
    expect(screen.queryByLabelText('Add a task to Kickoff')).not.toBeInTheDocument()
    await userEvent.keyboard('n')
    const input = await screen.findByLabelText('Add a task to Kickoff')
    expect(input).toHaveFocus()
    expect(readViewPreference('p1').collapsed).toEqual([])
    await userEvent.keyboard('{Escape}')
    await userEvent.tab()
  })

  it('remembers folds made from the group headers', async () => {
    renderList()
    await userEvent.click(screen.getByRole('button', { name: /Build/ }))
    expect(readViewPreference('p1').collapsed).toEqual(['ph2'])
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(readViewPreference('p1').collapsed).toEqual(['ph1', 'ph2'])
    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(readViewPreference('p1').collapsed).toEqual([])
  })
})
