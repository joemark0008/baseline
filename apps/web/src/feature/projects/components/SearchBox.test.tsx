import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBox } from './SearchBox'

describe('SearchBox (feature 011)', () => {
  it('echoes at once and reports the text once the typing pauses', async () => {
    const onChange = vi.fn()
    render(<SearchBox value="" onChange={onChange} delay={30} />)
    const box = screen.getByRole('searchbox', { name: 'Search tasks' })
    await userEvent.type(box, 'lab')
    expect(box).toHaveValue('lab')
    expect(onChange).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    expect(onChange).toHaveBeenCalledWith('lab')
  })

  it('clears on Escape and from the clear button', async () => {
    const onChange = vi.fn()
    render(<SearchBox value="lab" onChange={onChange} delay={30} />)
    const box = screen.getByRole('searchbox', { name: 'Search tasks' })
    expect(box).toHaveValue('lab')
    await userEvent.type(box, '{Escape}')
    expect(box).toHaveValue('')
    expect(onChange).toHaveBeenLastCalledWith('')
    await userEvent.type(box, 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(box).toHaveValue('')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('follows an outside change and focuses on the slash shortcut', async () => {
    const { rerender } = render(<SearchBox value="lab" onChange={vi.fn()} />)
    rerender(<SearchBox value="" onChange={vi.fn()} />)
    const box = screen.getByRole('searchbox', { name: 'Search tasks' })
    expect(box).toHaveValue('')
    expect(box).not.toHaveFocus()
    await userEvent.keyboard('/')
    expect(box).toHaveFocus()
    await userEvent.type(box, 'a/b')
    expect(box).toHaveValue('a/b')
  })
})
