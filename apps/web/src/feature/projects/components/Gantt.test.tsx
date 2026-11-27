import { render, screen } from '@testing-library/react'
import type { PhaseData } from '../lib'
import { Gantt, ganttWindow } from './Gantt'

const person = { id: 'ada', name: 'Ada', email: 'ada@x.dev', image: null }
const task = (over: Partial<PhaseData['tasks'][number]>): PhaseData['tasks'][number] => ({
  id: 't1',
  projectId: 'p1',
  phaseId: 'ph1',
  title: 'Validate workflows',
  description: null,
  owner: person,
  status: 'UPCOMING',
  priority: 'HIGH',
  startDate: null,
  dueDate: '2026-12-02',
  overdue: false,
  predecessor: null,
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
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    status: 'COMPLETE',
    tasks: [task({})],
    deliverables: [],
  },
  {
    id: 'ph2',
    name: 'Training',
    description: null,
    order: 2,
    owner: null,
    startDate: '2026-11-01',
    endDate: '2026-12-15',
    status: 'IN_PROGRESS',
    tasks: [
      task({
        id: 't2',
        phaseId: 'ph2',
        title: 'Run workshop',
        dueDate: '2026-11-20',
        overdue: true,
        predecessor: { id: 't1', title: 'Validate workflows' },
      }),
    ],
    deliverables: [],
  },
]

describe('Gantt', () => {
  it('derives the month window from the earliest and latest dates', () => {
    const window = ganttWindow(phases, null, '2027-02-16')
    expect(window?.months).toHaveLength(9)
    expect(
      ganttWindow([{ ...phases[0], startDate: null, endDate: null, tasks: [] }], null, null),
    ).toBeNull()
  })

  it('draws phase bars, task markers, overdue state and dependency cues', () => {
    render(<Gantt phases={phases} startDate={null} targetGoLiveDate="2027-02-16" />)
    expect(
      screen.getByRole('img', { name: 'Kickoff: 2026-06-01 to 2026-06-15' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Run workshop: due 2026-11-20, overdue' })).toHaveClass(
      'bg-destructive',
    )
    expect(screen.getByRole('img', { name: 'Depends on Validate workflows' })).toBeInTheDocument()
    expect(screen.getByLabelText('Scrollable Gantt timeline')).toHaveClass('overflow-x-auto')
    expect(screen.getByText('Jun 2026')).toBeInTheDocument()
    expect(screen.getByText('Feb 2027')).toBeInTheDocument()
  })

  it('explains what to do when nothing is dated', () => {
    render(
      <Gantt
        phases={[{ ...phases[0], startDate: null, endDate: null, tasks: [] }]}
        startDate={null}
        targetGoLiveDate={null}
      />,
    )
    expect(screen.getByText(/add start and end dates/i)).toBeInTheDocument()
  })
})
