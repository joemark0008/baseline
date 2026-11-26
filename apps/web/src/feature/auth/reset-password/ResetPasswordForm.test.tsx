import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResetPasswordForm } from './ResetPasswordForm'

const POLICY = { minLength: 8, maxLength: 128 }

async function fill(pw: string, confirm: string) {
  await userEvent.type(screen.getByLabelText('New password'), pw)
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))
}

describe('ResetPasswordForm', () => {
  it('explains when the link is no longer valid and shows no form', () => {
    render(
      <ResetPasswordForm
        status={{ valid: false, name: null }}
        policy={POLICY}
        onSubmit={vi.fn()}
      />,
    )
    expect(
      screen.getByText('This reset link is no longer valid. Ask an admin for a new one.'),
    ).toBeTruthy()
    expect(screen.queryByLabelText('New password')).toBeNull()
  })

  it("names the person and shows the server's password rules", () => {
    render(
      <ResetPasswordForm status={{ valid: true, name: 'Bo' }} policy={POLICY} onSubmit={vi.fn()} />,
    )
    expect(screen.getByText('Set a new password for Bo')).toBeTruthy()
    expect(screen.getByText('8–128 characters.')).toBeTruthy()
  })

  it('refuses a confirmation that does not match', async () => {
    const onSubmit = vi.fn()
    render(
      <ResetPasswordForm
        status={{ valid: true, name: 'Bo' }}
        policy={POLICY}
        onSubmit={onSubmit}
      />,
    )
    await fill('a-new-password', 'something-else')
    expect(screen.getByRole('alert').textContent).toBe("The passwords don't match.")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the new password and shows what the server says', async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue('This reset link is no longer valid. Ask an admin for a new one.')
    render(
      <ResetPasswordForm
        status={{ valid: true, name: 'Bo' }}
        policy={POLICY}
        onSubmit={onSubmit}
      />,
    )
    await fill('a-new-password', 'a-new-password')
    expect(onSubmit).toHaveBeenCalledWith('a-new-password')
    expect((await screen.findByRole('alert')).textContent).toMatch(/no longer valid/)
  })
})
