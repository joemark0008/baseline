import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

function Harness({ onConfirm }: { onConfirm: () => Promise<string | null> }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Deactivate
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Deactivate Bo?"
        description="Bo will be signed out and can't sign in."
        confirmLabel="Deactivate Bo"
        onConfirm={onConfirm}
      />
    </>
  )
}

async function openDialog() {
  await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
  return screen.getByRole('alertdialog', { name: 'Deactivate Bo?' })
}

describe('ConfirmDialog', () => {
  it('names the action and its consequence', async () => {
    render(<Harness onConfirm={vi.fn()} />)
    const dialog = await openDialog()
    expect(dialog).toHaveTextContent("Bo will be signed out and can't sign in.")
  })

  it('does nothing on cancel', async () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    await openDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('closes after a successful confirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(null)
    render(<Harness onConfirm={onConfirm} />)
    await openDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate Bo' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('stays open and shows the error when the action fails, and clears it on reopen', async () => {
    render(<Harness onConfirm={vi.fn().mockResolvedValue('Too many attempts')} />)
    const dialog = await openDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate Bo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts')
    expect(dialog).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await openDialog()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('disables both buttons while the action runs', async () => {
    let finish: (v: string | null) => void = () => {}
    const onConfirm = () => new Promise<string | null>((r) => (finish = r))
    render(<Harness onConfirm={onConfirm} />)
    await openDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate Bo' }))
    expect(screen.getByRole('button', { name: 'Deactivate Bo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    finish(null)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })
})
