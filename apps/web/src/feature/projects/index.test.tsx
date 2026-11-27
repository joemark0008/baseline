import { MockedProvider } from '@apollo/client/testing/react'
import type { MockedResponse } from '@apollo/client/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectsPage } from './index'
import { PROJECT_LIST } from './operations'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode
    to: string
    params: { id: string }
  }) => <a href={to.replace('$id', params.id)}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouteContext: () => ({ access: { permissions: ['projects:view'] } }),
}))

const row = (id: string, name: string, myOpenTasks: number, targetGoLiveDate: string | null) => ({
  __typename: 'ProjectListItem',
  id,
  name,
  hospitalName: `${name} Hospital`,
  status: 'ACTIVE',
  startDate: null,
  targetGoLiveDate,
  myRole: 'MEMBER',
  myOpenTasks,
  updatedAt: '2026-11-01T00:00:00Z',
  summary: {
    __typename: 'ProjectSummary',
    totalTasks: 4,
    openTasks: 3,
    overdueTasks: 1,
    phaseCount: 9,
    completePhases: 3,
    progress: 33,
  },
})
const meta = {
  __typename: 'PageMeta',
  total: 2,
  currentPage: 1,
  lastPage: 1,
  perPage: 100,
  hasNextPage: false,
  hasPrevPage: false,
}

describe('ProjectsPage (feature 010)', () => {
  it('shows project cards with progress, go-live, overdue and my open tasks, and re-sorts', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: PROJECT_LIST, variables: { page: 1, perPage: 100, sort: 'RECENT' } },
        result: {
          data: {
            projects: {
              __typename: 'ProjectsPage',
              data: [row('p1', 'Northstar', 2, '2027-03-01'), row('p2', 'Eastside', 0, null)],
              meta,
            },
          },
        },
      },
      {
        request: { query: PROJECT_LIST, variables: { page: 1, perPage: 100, sort: 'GO_LIVE' } },
        result: {
          data: {
            projects: {
              __typename: 'ProjectsPage',
              data: [row('p2', 'Eastside', 0, null), row('p1', 'Northstar', 2, '2027-03-01')],
              meta,
            },
          },
        },
      },
    ]
    render(
      <MockedProvider mocks={mocks}>
        <ProjectsPage />
      </MockedProvider>,
    )
    const cards = await screen.findAllByRole('listitem')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Northstar')
    expect(cards[0]).toHaveTextContent('1 Mar 2027')
    expect(screen.getAllByLabelText('33% of phases complete')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Northstar' })).toHaveAttribute(
      'href',
      '/projects/p1/work',
    )
    expect(cards[0]).toHaveTextContent('My open tasks2')
    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'GO_LIVE')
    await vi.waitFor(() => expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Eastside'))
  })
})
