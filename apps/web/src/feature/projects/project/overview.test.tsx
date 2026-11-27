import { MockedProvider } from '@apollo/client/testing/react'
import type { MockedResponse } from '@apollo/client/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ProjectData } from '../lib'
import { REORDER_PROJECT_PHASES } from '../operations'
import { ProjectContext } from './context'
import { ProjectOverviewTab } from './overview'

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
const base = {
  id: 'p1',
  name: 'Northstar',
  hospitalName: 'Northstar Hospital',
  description: null,
  status: 'ACTIVE',
  startDate: null,
  targetGoLiveDate: null,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  myRole: 'MANAGER',
  can: { manage: true, edit: true },
  summary: {
    totalTasks: 0,
    openTasks: 0,
    overdueTasks: 0,
    phaseCount: 3,
    completePhases: 0,
    progress: 0,
  },
  phases: [
    phase('ph1', 'Kickoff', 1),
    phase('ph2', 'Data Gathering', 2),
    phase('ph3', 'Training', 3),
  ],
  members: [],
  stakeholders: [],
  pendingInvites: [],
}

function renderOverview(project: typeof base, mocks: MockedResponse[] = []) {
  render(
    <MockedProvider mocks={mocks}>
      <ProjectContext.Provider
        value={{ project: project as unknown as ProjectData, refetch: vi.fn() }}
      >
        <ProjectOverviewTab />
      </ProjectContext.Provider>
    </MockedProvider>,
  )
}

describe('ProjectOverviewTab phases (feature 010)', () => {
  it('gives Managers a drag handle and keeps the arrow moves in the row menu', async () => {
    let sent: string[] | null = null
    renderOverview(base, [
      {
        request: {
          query: REORDER_PROJECT_PHASES,
          variables: { projectId: 'p1', phaseIds: ['ph2', 'ph1', 'ph3'] },
        },
        result: () => {
          sent = ['ph2', 'ph1', 'ph3']
          return { data: { reorderProjectPhases: [] } }
        },
      },
    ])
    expect(screen.getByLabelText('Drag to reorder Kickoff')).toHaveAttribute(
      'aria-roledescription',
      'sortable',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Kickoff' }))
    expect(await screen.findByRole('menuitem', { name: 'Move up' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move down' }))
    await vi.waitFor(() => expect(sent).toEqual(['ph2', 'ph1', 'ph3']))
  })

  it('shows Members the plan without handles or actions', () => {
    renderOverview({ ...base, myRole: 'MEMBER', can: { manage: false, edit: true } })
    expect(screen.queryByLabelText('Drag to reorder Kickoff')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actions for Kickoff' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })
})
