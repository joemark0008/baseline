import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupFormCard } from './SetupFormCard'

async function fill(password: string, confirm: string) {
  await userEvent.type(screen.getByLabelText(/setup token/i), 'tok-123')
  await userEvent.type(screen.getByLabelText(/^name/i), 'Ada')
  await userEvent.type(screen.getByLabelText(/^email/i), 'admin@x.dev')
  await userEvent.type(screen.getByLabelText(/^password/i), password)
  await userEvent.type(screen.getByLabelText(/confirm password/i), confirm)
  await userEvent.click(screen.getByRole('button', { name: /create admin/i }))
}

describe('SetupFormCard', () => {
  it('submits token, name, email and password', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render(<SetupFormCard minPasswordLength={8} onSubmit={onSubmit} />)
    await fill('longenough', 'longenough')
    expect(onSubmit).toHaveBeenCalledWith({
      token: 'tok-123',
      name: 'Ada',
      email: 'admin@x.dev',
      password: 'longenough',
    })
  })

  it('blocks mismatched passwords', async () => {
    const onSubmit = vi.fn()
    render(<SetupFormCard minPasswordLength={8} onSubmit={onSubmit} />)
    await fill('longenough', 'different1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('blocks passwords shorter than the minimum', async () => {
    const onSubmit = vi.fn()
    render(<SetupFormCard minPasswordLength={8} onSubmit={onSubmit} />)
    await fill('short1', 'short1')
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 8 characters')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the error returned by onSubmit', async () => {
    const message = 'Invalid setup token. Copy the latest one from the API log.'
    render(<SetupFormCard minPasswordLength={8} onSubmit={vi.fn().mockResolvedValue(message)} />)
    await fill('longenough', 'longenough')
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })
})
