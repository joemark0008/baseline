import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteForm } from './InviteForm'

const ROLES = [
  { id: 'role_member', name: 'Member' },
  { id: 'r_cashier', name: 'Cashier' },
]

describe('InviteForm', () => {
  it('starts on the default role the server lists first, and invites into the chosen one', async () => {
    const onInvite = vi
      .fn()
      .mockResolvedValue({ inviteUrl: 'https://app/invite?token=t', emailSent: false })
    render(<InviteForm roles={ROLES} onInvite={onInvite} />)
    expect(screen.getByLabelText(/role/i)).toHaveValue('role_member')
    await userEvent.type(screen.getByLabelText(/email/i), 'cy@x.dev')
    await userEvent.selectOptions(screen.getByLabelText(/role/i), 'Cashier')
    await userEvent.click(screen.getByRole('button', { name: /invite/i }))
    expect(onInvite).toHaveBeenCalledWith('cy@x.dev', 'r_cashier')
    expect(await screen.findByText('https://app/invite?token=t')).toBeInTheDocument()
    expect(screen.getByText(/send this link to the invitee/i)).toBeInTheDocument()
  })

  it('says the invitation was emailed and keeps the link as a backup', async () => {
    const onInvite = vi
      .fn()
      .mockResolvedValue({ inviteUrl: 'https://app/invite?token=t', emailSent: true })
    render(<InviteForm roles={ROLES} onInvite={onInvite} />)
    await userEvent.type(screen.getByLabelText(/email/i), 'cy@x.dev')
    await userEvent.click(screen.getByRole('button', { name: /invite/i }))
    expect(await screen.findByText(/invitation emailed to cy@x.dev/i)).toBeInTheDocument()
    expect(screen.getByText('https://app/invite?token=t')).toBeInTheDocument()
    expect(screen.queryByText(/send this link to the invitee/i)).toBeNull()
  })

  it('only offers the roles it is given', () => {
    render(<InviteForm roles={ROLES} onInvite={vi.fn()} />)
    expect(screen.queryByRole('option', { name: 'Admin' })).toBeNull()
  })
})
