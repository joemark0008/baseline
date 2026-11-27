import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyWork } from './EmptyWork'

describe('EmptyWork (feature 011)', () => {
  it('explains each reason and offers the matching action', async () => {
    const onShowDone = vi.fn()
    const onClear = vi.fn()
    const { rerender } = render(
      <EmptyWork reason="all-done" hiddenDone={4} onShowDone={onShowDone} onClear={onClear} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('All work in this view is done.')
    await userEvent.click(screen.getByRole('button', { name: 'Show done' }))
    expect(onShowDone).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument()

    rerender(
      <EmptyWork reason="no-match" hiddenDone={0} onShowDone={onShowDone} onClear={onClear} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('No tasks match.')
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Show done' })).not.toBeInTheDocument()

    rerender(<EmptyWork reason="only-done-match" hiddenDone={3} onShowDone={onShowDone} />)
    expect(screen.getByRole('status')).toHaveTextContent('3 completed tasks match.')
    expect(screen.getByRole('button', { name: 'Show done' })).toBeInTheDocument()

    rerender(<EmptyWork reason="only-done-match" hiddenDone={1} />)
    expect(screen.getByRole('status')).toHaveTextContent('1 completed task matches.')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    rerender(<EmptyWork reason="none" hiddenDone={0} />)
    expect(screen.getByRole('status')).toHaveTextContent('No tasks yet.')
  })
})
