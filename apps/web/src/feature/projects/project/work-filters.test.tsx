import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useShortcut } from '../components/use-shortcut'
import type { ProjectData, WorkSearch } from '../lib'
import { ReadabilityProvider } from '../readability'
import { WorkFilters } from './work-filters'

const searchState: { search: WorkSearch; setSearch: ReturnType<typeof vi.fn> } = {
  search: {},
  setSearch: vi.fn(),
}
vi.mock('./work-search', () => ({ useWorkSearch: () => searchState }))

const project = {
  id: 'p1',
  phases: [{ id: 'ph1', name: 'Kickoff', order: 1, tasks: [] }],
  members: [{ user: { id: 'ada', name: 'Ada' } }],
} as unknown as ProjectData

function Shortcut({ onN }: { onN: () => void }) {
  useShortcut('n', onN)
  return null
}

const renderFilters = (onN = vi.fn()) =>
  render(
    <ReadabilityProvider projectId="p1" phaseIds={['ph1']}>
      <Shortcut onN={onN} />
      <WorkFilters project={project} hiddenDone={3} />
    </ReadabilityProvider>,
  )

describe('WorkFilters (feature 011)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    searchState.search = {}
  })

  it('writes the search text after a pause and reads it back', async () => {
    searchState.search = { q: 'lab' }
    renderFilters()
    const box = screen.getByRole('searchbox', { name: 'Search tasks' })
    expect(box).toHaveValue('lab')
    await userEvent.type(box, 's')
    await vi.waitFor(() => expect(searchState.setSearch).toHaveBeenCalledWith({ q: 'labs' }))
  })

  it('toggles Mine and Show done', async () => {
    renderFilters()
    const mine = screen.getByRole('button', { name: 'Mine' })
    expect(mine).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(mine)
    expect(searchState.setSearch).toHaveBeenCalledWith({ mine: true })
    searchState.search = { mine: true }
    renderFilters()
    const [, pressed] = screen.getAllByRole('button', { name: 'Mine' })
    expect(pressed).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(pressed)
    expect(searchState.setSearch).toHaveBeenLastCalledWith({ mine: undefined })
    const done = screen.getAllByRole('button', { name: 'Show done (3)' })[0]
    await userEvent.click(done)
    expect(screen.getAllByRole('button', { name: 'Hide done' })[0]).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('keeps shortcuts silent while typing in the search box', async () => {
    const onN = vi.fn()
    renderFilters(onN)
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'n')
    expect(onN).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await userEvent.tab()
    await userEvent.keyboard('n')
    expect(onN).toHaveBeenCalledTimes(1)
  })
})
