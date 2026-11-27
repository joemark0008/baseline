import { MockedProvider } from '@apollo/client/testing/react'
import type { MockedResponse } from '@apollo/client/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ProjectData } from '../lib'
import { PROJECT_ACTIVITY, PROJECT_TASK, UPDATE_PROJECT_TASK } from '../operations'
import { TaskDetailSheet } from './TaskDetailSheet'

const person = { id: 'ada', name: 'Ada', email: 'ada@x.dev', image: null }
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
    totalTasks: 1,
    openTasks: 1,
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
      tasks: [],
      deliverables: [],
    },
  ],
  members: [{ user: person, role: 'MEMBER', addedAt: '2026-11-01T00:00:00Z' }],
  stakeholders: [],
  pendingInvites: [],
} as unknown as ProjectData
const task = {
  __typename: 'ProjectTask',
  id: 't1',
  projectId: 'p1',
  phaseId: 'ph1',
  title: 'Validate workflows',
  description: null,
  owner: null,
  status: 'UPCOMING',
  priority: 'MEDIUM',
  startDate: null,
  dueDate: null,
  overdue: false,
  predecessor: null,
  position: 1,
  predecessorConflict: false,
  completedAt: null,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  comments: [],
}
const activity = {
  __typename: 'ProjectActivityPage',
  data: [
    {
      __typename: 'ProjectActivity',
      id: 'a1',
      kind: 'TASK_UPDATED',
      summary: 'moved task Validate workflows to in progress',
      targetType: 'task',
      targetId: 't1',
      createdAt: '2026-11-02T10:00:00Z',
      actor: { __typename: 'PersonSummary', ...person },
    },
  ],
  meta: {
    __typename: 'PageMeta',
    total: 1,
    currentPage: 1,
    lastPage: 1,
    perPage: 20,
    hasNextPage: false,
    hasPrevPage: false,
  },
}

describe('TaskDetailSheet (feature 010)', () => {
  it('edits fields in place, lists the task activity and leaves the page behind usable', async () => {
    let updated: unknown = null
    const mocks: MockedResponse[] = [
      {
        request: { query: PROJECT_TASK, variables: { id: 't1' } },
        result: { data: { projectTask: task } },
        maxUsageCount: 3,
      },
      {
        request: {
          query: PROJECT_ACTIVITY,
          variables: { projectId: 'p1', targetId: 't1', perPage: 20 },
        },
        result: { data: { projectActivity: activity } },
        maxUsageCount: 3,
      },
      {
        request: {
          query: UPDATE_PROJECT_TASK,
          variables: { input: { id: 't1', priority: 'HIGH' } },
        },
        result: () => {
          updated = { priority: 'HIGH' }
          return { data: { updateProjectTask: { ...task, priority: 'HIGH' } } }
        },
      },
    ]
    const outside = vi.fn()
    render(
      <MockedProvider mocks={mocks}>
        <div>
          <button type="button" onClick={outside}>
            Behind the panel
          </button>
          <TaskDetailSheet taskId="t1" project={project} onClose={vi.fn()} />
        </div>
      </MockedProvider>,
    )
    expect(await screen.findByLabelText('Priority')).toHaveValue('MEDIUM')
    expect(screen.getByLabelText('Title')).toHaveValue('Validate workflows')
    expect(screen.getByLabelText('Owner')).toHaveValue('')
    expect(
      await screen.findByText('moved task Validate workflows to in progress'),
    ).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Priority'), 'HIGH')
    await vi.waitFor(() => expect(updated).toEqual({ priority: 'HIGH' }))
    await userEvent.click(screen.getByRole('button', { name: 'Behind the panel' }))
    expect(outside).toHaveBeenCalled()
  })
})
