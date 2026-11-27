import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useShortcut } from './use-shortcut'

function Harness({ onKey, dialog = false }: { onKey: () => void; dialog?: boolean }) {
  useShortcut('n', onKey)
  return (
    <div>
      <input aria-label="Title" />
      <button type="button">Elsewhere</button>
      {dialog ? (
        <div role="dialog" data-state="open">
          <button type="button">In dialog</button>
        </div>
      ) : null}
    </div>
  )
}

describe('useShortcut', () => {
  it('fires on the bare key outside fields', async () => {
    const onKey = vi.fn()
    render(<Harness onKey={onKey} />)
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))
    await userEvent.keyboard('n')
    expect(onKey).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Control>}n{/Control}')
    expect(onKey).toHaveBeenCalledTimes(1)
  })

  it('stays silent while typing or while a dialog is open', async () => {
    const onKey = vi.fn()
    const { rerender } = render(<Harness onKey={onKey} />)
    await userEvent.type(screen.getByLabelText('Title'), 'n')
    expect(onKey).not.toHaveBeenCalled()
    rerender(<Harness onKey={onKey} dialog />)
    await userEvent.click(screen.getByRole('button', { name: 'In dialog' }))
    await userEvent.keyboard('n')
    expect(onKey).not.toHaveBeenCalled()
  })
})
