import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginFormCard } from './LoginFormCard'

describe('LoginFormCard', () => {
  it('submits the identifier and password and shows the returned error', async () => {
    const onSubmit = vi.fn().mockResolvedValue('Invalid credentials')
    render(<LoginFormCard onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/email or username/i), 'jane')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(onSubmit).toHaveBeenCalledWith('jane', 'secret123')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
  })

  it('shows the deactivated message from the server', async () => {
    const message = 'Your account is deactivated. Ask an admin to reactivate it.'
    render(<LoginFormCard onSubmit={vi.fn().mockResolvedValue(message)} />)
    await userEvent.type(screen.getByLabelText(/email or username/i), 'jane')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('shows the Google button only when a handler is given', () => {
    const { rerender } = render(<LoginFormCard onSubmit={async () => null} />)
    expect(screen.queryByText(/google/i)).toBeNull()
    rerender(<LoginFormCard onSubmit={async () => null} onGoogle={() => undefined} />)
    expect(screen.getByText(/google/i)).toBeInTheDocument()
  })
})
