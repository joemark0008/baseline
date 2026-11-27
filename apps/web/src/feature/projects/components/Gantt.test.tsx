import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  position: 1,
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

  it('draws only the phase row for a folded phase and toggles from its label (feature 011)', async () => {
    const onTogglePhase = vi.fn()
    render(
      <Gantt
        phases={phases}
        startDate={null}
        targetGoLiveDate={null}
        collapsedPhaseIds={new Set(['ph2'])}
        onTogglePhase={onTogglePhase}
      />,
    )
    expect(
      screen.getByRole('img', { name: 'Training: 2026-11-01 to 2026-12-15' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Run workshop')).not.toBeInTheDocument()
    expect(screen.getByText('Validate workflows')).toBeInTheDocument()
    expect(screen.getByText('(1 task)')).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Expand Training' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(onTogglePhase).toHaveBeenCalledWith('ph2')
    expect(screen.getByRole('button', { name: 'Collapse Kickoff' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
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

describe('Gantt interaction (feature 010)', () => {
  const dated = [
    {
      ...phases[1],
      tasks: [
        task({
          id: 't3',
          phaseId: 'ph2',
          title: 'Both dates',
          startDate: '2026-11-03',
          dueDate: '2026-11-10',
        }),
        task({
          id: 't4',
          phaseId: 'ph2',
          title: 'Conflicting',
          startDate: '2026-11-01',
          dueDate: '2026-11-05',
          predecessor: { id: 't3', title: 'Both dates' },
          predecessorConflict: true,
        }),
        phases[1].tasks[0],
      ],
    },
  ]

  it('keeps bars as plain images without callbacks and shows the conflict cue', () => {
    render(<Gantt phases={dated} startDate={null} targetGoLiveDate={null} />)
    expect(
      screen.getByRole('img', { name: 'Both dates: 2026-11-03 to 2026-11-10' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Both dates/ })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Starts before Both dates is due' })).toBeInTheDocument()
  })

  it('shifts a bar by a week from the keyboard and saves on Enter', async () => {
    const onTaskDatesChange = vi.fn().mockResolvedValue(undefined)
    render(
      <Gantt
        phases={dated}
        startDate={null}
        targetGoLiveDate={null}
        onTaskDatesChange={onTaskDatesChange}
      />,
    )
    const bar = screen.getByRole('button', { name: /^Both dates: 2026-11-03 to 2026-11-10/ })
    bar.focus()
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(
      screen.getByRole('button', { name: /^Both dates: 2026-11-10 to 2026-11-17/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Both dates now 10 Nov to 17 Nov/)).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(onTaskDatesChange).toHaveBeenCalledWith('t3', {
      startDate: '2026-11-10',
      dueDate: '2026-11-17',
    })
    expect(await screen.findByText('Saved.')).toBeInTheDocument()
  })

  it('resizes only the due date with Alt, cancels with Escape, and moves a due-only marker', async () => {
    const onTaskDatesChange = vi.fn().mockResolvedValue(undefined)
    render(
      <Gantt
        phases={dated}
        startDate={null}
        targetGoLiveDate={null}
        onTaskDatesChange={onTaskDatesChange}
      />,
    )
    const bar = screen.getByRole('button', { name: /^Both dates: 2026-11-03 to 2026-11-10/ })
    bar.focus()
    await userEvent.keyboard('{Alt>}{ArrowRight}{ArrowRight}{/Alt}')
    expect(
      screen.getByRole('button', { name: /^Both dates: 2026-11-03 to 2026-11-12/ }),
    ).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(
      screen.getByRole('button', { name: /^Both dates: 2026-11-03 to 2026-11-10/ }),
    ).toBeInTheDocument()
    expect(onTaskDatesChange).not.toHaveBeenCalled()
    const marker = screen.getByRole('button', { name: /^Run workshop: due 2026-11-20/ })
    marker.focus()
    await userEvent.keyboard('{ArrowLeft}{Enter}')
    expect(onTaskDatesChange).toHaveBeenCalledWith('t2', { startDate: null, dueDate: '2026-11-19' })
  })

  it('leaves phase bars read-only for Members and draggable for Managers', () => {
    const { rerender } = render(
      <Gantt phases={dated} startDate={null} targetGoLiveDate={null} onTaskDatesChange={vi.fn()} />,
    )
    expect(
      screen.getByRole('img', { name: 'Training: 2026-11-01 to 2026-12-15' }),
    ).toBeInTheDocument()
    rerender(
      <Gantt
        phases={dated}
        startDate={null}
        targetGoLiveDate={null}
        onTaskDatesChange={vi.fn()}
        onPhaseDatesChange={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: /^Training: 2026-11-01 to 2026-12-15/ }),
    ).toBeInTheDocument()
  })
})
