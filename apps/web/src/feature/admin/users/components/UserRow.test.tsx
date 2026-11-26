import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRow, type RowUser } from './UserRow'

const user: RowUser = {
  id: 'u2',
  name: 'Bo',
  email: 'bo@x.dev',
  username: null,
  accessRole: { id: 'role_member', name: 'Member', kind: 'MEMBER' },
  deactivated: false,
  createdAt: '2026-01-01',
  can: { edit: true, changeRole: true, deactivate: true, reactivate: false, resetPassword: true },
  passwordResetExpiresAt: null,
}
// The server sends only roles the caller may assign.
const OPTIONS = [
  { id: 'role_member', name: 'Member' },
  { id: 'r1', name: 'Cashier' },
]
const withCan = (can: Partial<RowUser['can']>, over: Partial<RowUser> = {}): RowUser => ({
  ...user,
  ...over,
  can: { ...user.can, ...can },
})
const handlers = () => ({
  onSetRole: vi.fn(),
  onUpdate: vi.fn().mockResolvedValue(true),
  onDeactivate: vi.fn().mockResolvedValue(null),
  onReactivate: vi.fn(),
  onResetPassword: vi.fn(),
  onCancelReset: vi.fn().mockResolvedValue(null),
})

const openActions = () => userEvent.click(screen.getByRole('button', { name: 'Actions for Bo' }))
const menuItem = (name: string) => screen.getByRole('menuitem', { name })

const inTable = (ui: React.ReactNode) =>
  render(
    <table>
      <tbody>{ui}</tbody>
    </table>,
  )

describe('UserRow', () => {
  it('moves a person to another role from the server-provided options', async () => {
    const h = handlers()
    inTable(<UserRow user={user} roleOptions={OPTIONS} {...h} />)
    await userEvent.selectOptions(screen.getByLabelText('Role of Bo'), 'Cashier')
    expect(h.onSetRole).toHaveBeenCalledWith('r1')
  })

  it('shows only the controls the server allows', () => {
    const locked = withCan({
      changeRole: false,
      deactivate: false,
      edit: false,
      resetPassword: false,
    })
    inTable(<UserRow user={locked} roleOptions={OPTIONS} {...handlers()} />)
    expect(screen.queryByLabelText('Role of Bo')).toBeNull()
    expect(screen.getByText('Member')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actions for Bo' })).toBeNull()
  })

  it('hides actions the server does not allow', async () => {
    inTable(<UserRow user={withCan({ deactivate: false })} roleOptions={OPTIONS} {...handlers()} />)
    await openActions()
    expect(screen.queryByRole('menuitem', { name: 'Deactivate' })).toBeNull()
    expect(menuItem('Edit')).toBeInTheDocument()
  })

  it('deactivates only after confirmation', async () => {
    const h = handlers()
    inTable(<UserRow user={user} roleOptions={OPTIONS} {...h} />)
    await openActions()
    await userEvent.click(menuItem('Deactivate'))
    const dialog = screen.getByRole('alertdialog', { name: 'Deactivate Bo?' })
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(h.onDeactivate).not.toHaveBeenCalled()
    await waitFor(() => expect(dialog).not.toBeInTheDocument())

    await openActions()
    await userEvent.click(menuItem('Deactivate'))
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    expect(h.onDeactivate).toHaveBeenCalledOnce()
  })

  it('keeps the confirmation open with the error when deactivation fails', async () => {
    const h = { ...handlers(), onDeactivate: vi.fn().mockResolvedValue('Not allowed') }
    inTable(<UserRow user={user} roleOptions={OPTIONS} {...h} />)
    await openActions()
    await userEvent.click(menuItem('Deactivate'))
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Not allowed')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('edits name and username, and reactivates when allowed', async () => {
    const h = handlers()
    const gone = withCan({ deactivate: false, reactivate: true }, { deactivated: true })
    inTable(<UserRow user={gone} roleOptions={OPTIONS} {...h} />)
    await openActions()
    await userEvent.click(menuItem('Reactivate'))
    expect(h.onReactivate).toHaveBeenCalled()

    await openActions()
    await userEvent.click(menuItem('Edit'))
    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.type(screen.getByLabelText('Name'), 'Bob')
    await userEvent.type(screen.getByLabelText('Username'), 'bob')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(h.onUpdate).toHaveBeenCalledWith({ name: 'Bob', username: 'bob' })
  })

  it('offers a password reset only when the server allows it', async () => {
    const h = handlers()
    const { unmount } = inTable(<UserRow user={user} roleOptions={OPTIONS} {...h} />)
    await openActions()
    await userEvent.click(menuItem('Reset password'))
    expect(h.onResetPassword).toHaveBeenCalled()
    unmount()
    inTable(
      <UserRow user={withCan({ resetPassword: false })} roleOptions={OPTIONS} {...handlers()} />,
    )
    await openActions()
    expect(screen.queryByRole('menuitem', { name: 'Reset password' })).toBeNull()
  })

  it('shows a pending reset link with its expiry and lets an Admin cancel it', async () => {
    const h = handlers()
    const pending = withCan({}, { passwordResetExpiresAt: '2026-01-02T15:00:00.000Z' })
    inTable(<UserRow user={pending} roleOptions={OPTIONS} {...h} />)
    expect(screen.getByText(/Reset link pending until/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel reset link' }))
    expect(h.onCancelReset).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel link' }))
    expect(h.onCancelReset).toHaveBeenCalledOnce()
  })
})
