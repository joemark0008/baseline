import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChangePasswordForm } from './ChangePasswordForm'

const POLICY = { minLength: 8, maxLength: 128 }

async function fill(current: string, next: string, confirm = next) {
  await userEvent.type(screen.getByLabelText('Current password'), current)
  await userEvent.type(screen.getByLabelText('New password'), next)
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('ChangePasswordForm', () => {
  it('changes the password and confirms it, clearing the fields', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render(<ChangePasswordForm policy={POLICY} onSubmit={onSubmit} />)
    expect(screen.getByText(/8–128 characters/)).toBeTruthy()
    await fill('old-password', 'new-password')
    expect(onSubmit).toHaveBeenCalledWith('old-password', 'new-password')
    expect((await screen.findByRole('status')).textContent).toMatch(
      /Password changed\. Other devices have been signed out\./,
    )
    expect((screen.getByLabelText('Current password') as HTMLInputElement).value).toBe('')
  })

  it("shows the server's error", async () => {
    const onSubmit = vi.fn().mockResolvedValue('Your current password is incorrect.')
    render(<ChangePasswordForm policy={POLICY} onSubmit={onSubmit} />)
    await fill('wrong-password', 'new-password')
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Your current password is incorrect.',
    )
  })

  it('refuses a confirmation that does not match', async () => {
    const onSubmit = vi.fn()
    render(<ChangePasswordForm policy={POLICY} onSubmit={onSubmit} />)
    await fill('old-password', 'new-password', 'other-password')
    expect(screen.getByRole('alert').textContent).toBe("The passwords don't match.")
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
