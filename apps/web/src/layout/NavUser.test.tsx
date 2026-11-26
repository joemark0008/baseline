import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { initials, NavUser } from './NavUser'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

function renderUser(onSignOut = vi.fn()) {
  render(
    <SidebarProvider>
      <NavUser name="Bo Li" email="bo@x.dev" onSignOut={onSignOut} />
    </SidebarProvider>,
  )
  return onSignOut
}

describe('NavUser', () => {
  it('shows who is signed in', () => {
    renderUser()
    const trigger = screen.getByRole('button', { name: 'Account menu for Bo Li' })
    expect(trigger).toHaveTextContent('BL')
    expect(trigger).toHaveTextContent('bo@x.dev')
  })

  it('offers Account and Sign out', async () => {
    const onSignOut = renderUser()
    await userEvent.click(screen.getByRole('button', { name: 'Account menu for Bo Li' }))
    expect(screen.getByRole('menuitem', { name: 'Account' })).toHaveAttribute('href', '/settings')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it('falls back to a placeholder when the name has no letters', () => {
    expect(initials('  ')).toBe('?')
    expect(initials('ada lovelace byron')).toBe('AL')
  })
})
