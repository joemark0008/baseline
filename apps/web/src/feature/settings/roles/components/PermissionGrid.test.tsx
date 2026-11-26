import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PermissionGrid, type GridArea } from './PermissionGrid'

const AREAS: GridArea[] = [
  {
    key: 'users',
    name: 'Users',
    actions: [
      { action: 'VIEW', description: 'See the user list', requires: [] },
      { action: 'DELETE', description: 'Deactivate a person', requires: ['VIEW'] },
    ],
  },
  {
    key: 'invites',
    name: 'Invites',
    actions: [{ action: 'ADD', description: 'Send invites', requires: [] }],
  },
]

describe('PermissionGrid', () => {
  it('shows one row per feature, greys out unused actions and explains each action', () => {
    render(<PermissionGrid areas={AREAS} value={[]} onChange={() => undefined} />)
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 features
    expect(screen.getByRole('checkbox', { name: 'Users: View' })).toHaveAttribute(
      'title',
      'See the user list',
    )
    expect(screen.queryByRole('checkbox', { name: 'Users: Add' })).toBeNull()
    expect(screen.getAllByLabelText(/not used/i).length).toBeGreaterThan(0)
  })

  it('ticks what the server says an action requires', async () => {
    const onChange = vi.fn()
    render(<PermissionGrid areas={AREAS} value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Users: Delete' }))
    expect(onChange).toHaveBeenCalledWith(['users:view', 'users:delete'])
  })

  it('follows the server rule rather than assuming one', async () => {
    const onChange = vi.fn()
    const free: GridArea[] = [
      {
        key: 'notes',
        name: 'Notes',
        actions: [
          { action: 'VIEW', description: 'v', requires: [] },
          { action: 'ADD', description: 'a', requires: [] },
        ],
      },
    ]
    render(<PermissionGrid areas={free} value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Notes: Add' }))
    expect(onChange).toHaveBeenCalledWith(['notes:add'])
  })

  it('unticks actions that require the one unticked', async () => {
    const onChange = vi.fn()
    render(
      <PermissionGrid areas={AREAS} value={['users:view', 'users:delete']} onChange={onChange} />,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Users: View' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('is read-only for Admin', () => {
    render(
      <PermissionGrid areas={AREAS} value={['users:view']} onChange={() => undefined} readOnly />,
    )
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeDisabled()
  })
})
