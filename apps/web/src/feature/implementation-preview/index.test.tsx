import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@testing-library/react'
import { ProjectPreviewPage } from './index'

describe('ProjectPreviewPage', () => {
  it('shows a fictional HIS implementation overview and its lifecycle phases', () => {
    render(<ProjectPreviewPage />)

    expect(screen.getByText('DEMO PREVIEW · SAMPLE DATA')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Northstar Community Hospital' }),
    ).toBeInTheDocument()
    expect(screen.getByText('68%')).toBeInTheDocument()
    expect(screen.getAllByText('Training').length).toBeGreaterThan(0)

    const phases = screen.getByRole('list', { name: 'Implementation phases' })
    expect(within(phases).getByText('Kickoff')).toBeInTheDocument()
    expect(within(phases).getByText('Data Gathering')).toBeInTheDocument()
    expect(within(phases).getByText('Data Build-Up')).toBeInTheDocument()
    expect(within(phases).getByText('Requirements Analysis')).toBeInTheDocument()
    expect(within(phases).getByText('Training')).toBeInTheDocument()
    expect(within(phases).getByText('Pre-Go-Live')).toBeInTheDocument()
    expect(within(phases).getByText('Go-Live')).toBeInTheDocument()
    expect(within(phases).getByText('Post-Go-Live Support')).toBeInTheDocument()
    expect(within(phases).getByText('Monitoring & Continuous Improvement')).toBeInTheDocument()
  })

  it('switches to a timeline that shows all implementation phases', async () => {
    const user = userEvent.setup()
    render(<ProjectPreviewPage />)

    await user.click(screen.getByRole('button', { name: 'Timeline' }))

    const timeline = screen.getByRole('region', { name: 'Project timeline' })
    expect(within(timeline).getByText('Kickoff')).toBeInTheDocument()
    expect(within(timeline).getByText('Data Gathering')).toBeInTheDocument()
    expect(within(timeline).getByText('Monitoring & Continuous Improvement')).toBeInTheDocument()
    expect(within(timeline).getByText('Jun 2026')).toBeInTheDocument()
    expect(within(timeline).getByText('Jun 2027')).toBeInTheDocument()
  })

  it('filters the task queue to overdue work', async () => {
    const user = userEvent.setup()
    render(<ProjectPreviewPage />)

    await user.click(screen.getByRole('button', { name: 'Tasks' }))
    await user.click(screen.getByRole('button', { name: 'Overdue' }))

    expect(screen.getByText('Validate nursing workflows with department leads')).toBeInTheDocument()
    expect(screen.queryByText('Run superuser training workshop')).not.toBeInTheDocument()
  })

  it('shows data readiness deliverables with their review status', async () => {
    const user = userEvent.setup()
    render(<ProjectPreviewPage />)

    await user.click(screen.getByRole('button', { name: 'Data readiness' }))

    expect(screen.getByRole('heading', { name: 'Data readiness' })).toBeInTheDocument()
    expect(screen.getByText('Pharmacy item master')).toBeInTheDocument()
    expect(screen.getByText('Data migration dry run')).toBeInTheDocument()
    expect(screen.getByText('In review')).toBeInTheDocument()
  })

  it('shows fictional client and vendor team members and recent activity', () => {
    render(<ProjectPreviewPage />)

    expect(screen.getByRole('heading', { name: 'Project team' })).toBeInTheDocument()
    expect(screen.getByText('Amina Yusuf')).toBeInTheDocument()
    expect(screen.getAllByText('David Chen').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument()
    expect(screen.getByText('Nursing workflow mapping')).toBeInTheDocument()
  })

  it('surfaces immediate implementation work on the overview', () => {
    render(<ProjectPreviewPage />)

    expect(screen.getByRole('heading', { name: 'Upcoming work' })).toBeInTheDocument()
    expect(screen.getByText('Review pharmacy item master')).toBeInTheDocument()
    expect(screen.getByText('Run superuser training workshop')).toBeInTheDocument()
  })
})
