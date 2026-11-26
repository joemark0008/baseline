import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen } from '@testing-library/react'
import { GraphQLError } from 'graphql'
import { InvitePage } from './index'
import { VALIDATE_INVITE } from './operations'

vi.mock('@/lib/auth-client', () => ({ signUp: { email: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))

function renderWith(errors: GraphQLError[] | undefined, data?: unknown) {
  const mocks = [
    {
      request: { query: VALIDATE_INVITE, variables: { token: 'tok' } },
      result: errors ? { errors } : { data },
    },
  ]
  return render(
    <MockedProvider mocks={mocks}>
      <InvitePage token="tok" email="a@b.test" />
    </MockedProvider>,
  )
}

describe('InvitePage', () => {
  it('shows the wait instead of "not valid" when the token check is rate limited', async () => {
    renderWith([
      new GraphQLError('Too many requests. Try again in 30 seconds.', {
        extensions: { code: 'TOO_MANY_REQUESTS', retryAfter: 30 },
      }),
    ])
    expect(
      await screen.findByText('Too many attempts. Try again in 30 seconds.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('This invitation is not valid')).not.toBeInTheDocument()
  })

  it('still explains an invalid invitation', async () => {
    renderWith(undefined, { validateInviteToken: { valid: false, email: null, role: null } })
    expect(await screen.findByText('This invitation is not valid')).toBeInTheDocument()
  })
})
