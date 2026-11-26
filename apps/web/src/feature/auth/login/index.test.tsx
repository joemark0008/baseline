import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './index'

const { signIn, navigate } = vi.hoisted(() => ({
  signIn: { email: vi.fn(), username: vi.fn(), social: vi.fn() },
  navigate: vi.fn(),
}))
vi.mock('@/lib/auth-client', () => ({ signIn }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

type FetchOptions = { onError: (ctx: { response: Response }) => void }

async function submit(identifier: string) {
  await userEvent.type(screen.getByLabelText('Email or username'), identifier)
  await userEvent.type(screen.getByLabelText('Password'), 'whatever')
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the wait when the sign-in system refuses for rate limiting', async () => {
    signIn.email.mockImplementation(async (_body: unknown, opts: FetchOptions) => {
      opts.onError({
        response: new Response(null, { status: 429, headers: { 'X-Retry-After': '42' } }),
      })
      return { error: { status: 429, message: 'Too many requests. Please try again later.' } }
    })
    render(<LoginPage />)
    await submit('a@b.test')
    expect(
      await screen.findByText('Too many attempts. Try again in 42 seconds.'),
    ).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('still shows the server message for other failures', async () => {
    signIn.username.mockResolvedValue({
      error: { status: 401, message: 'Invalid username or password' },
    })
    render(<LoginPage />)
    await submit('bo')
    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument()
  })
})
