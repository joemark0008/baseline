import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteForm } from './InviteForm'

const ROLES = [
  { id: 'role_member', name: 'Member' },
  { id: 'r_cashier', name: 'Cashier' },
]

describe('InviteForm', () => {
  it('starts on the default role the server lists first, and invites into the chosen one', async () => {
    const onInvite = vi.fn().mockResolvedValue({ inviteUrl: 'https://app/invite?token=t' })
    render(<InviteForm roles={ROLES} onInvite={onInvite} />)
    expect(screen.getByLabelText(/role/i)).toHaveValue('role_member')
    await userEvent.type(screen.getByLabelText(/email/i), 'cy@x.dev')
    await userEvent.selectOptions(screen.getByLabelText(/role/i), 'Cashier')
    await userEvent.click(screen.getByRole('button', { name: /invite/i }))
    expect(onInvite).toHaveBeenCalledWith('cy@x.dev', 'r_cashier')
    expect(await screen.findByText('https://app/invite?token=t')).toBeInTheDocument()
  })

  it('only offers the roles it is given', () => {
    render(<InviteForm roles={ROLES} onInvite={vi.fn()} />)
    expect(screen.queryByRole('option', { name: 'Admin' })).toBeNull()
  })
})
