import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import type { Access } from '@/lib/access'
import { NavMain } from './NavMain'

const { location } = vi.hoisted(() => ({ location: { pathname: '/dashboard' } }))
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => location,
  Link: ({
    to,
    children,
    onClick,
    ...rest
  }: {
    to: string
    children: ReactNode
    onClick?: () => void
  }) => {
    delete (rest as Record<string, unknown>).activeOptions
    return (
      <a
        href={to}
        {...rest}
        onClick={(e) => {
          e.preventDefault()
          onClick?.()
        }}
      >
        {children}
      </a>
    )
  },
}))

const admin: Access = {
  role: { id: 'a', name: 'Admin', kind: 'ADMIN' },
  permissions: ['users:view', 'roles:view'],
}
const member: Access = { role: { id: 'm', name: 'Member', kind: 'MEMBER' }, permissions: [] }

function renderNav(access: Access, pathname: string) {
  location.pathname = pathname
  return render(
    <SidebarProvider>
      <NavMain access={access} />
    </SidebarProvider>,
  )
}

const link = (name: string) => screen.queryByRole('link', { name })

describe('NavMain', () => {
  it('opens the section that holds the current page and marks that page', () => {
    renderNav(admin, '/settings/roles/abc')
    expect(link('Roles')).toHaveAttribute('data-active', 'true')
    expect(link('History')).toHaveAttribute('data-active', 'false')
    expect(screen.getByRole('button', { name: 'Toggle Settings' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('keeps other sections closed, and toggles them open and shut', async () => {
    renderNav(admin, '/dashboard')
    expect(link('Dashboard')).toHaveAttribute('data-active', 'true')
    expect(link('Roles')).toBeNull()
    const toggle = screen.getByRole('button', { name: 'Toggle Settings' })
    await userEvent.click(toggle)
    expect(link('Roles')).toBeInTheDocument()
    await userEvent.click(toggle)
    expect(link('Roles')).toBeNull()
  })

  it('shows only what the person may use', () => {
    renderNav(member, '/settings')
    expect(screen.queryByText('Admin')).toBeNull()
    expect(link('Users')).toBeNull()
    expect(link('Account')).toBeInTheDocument()
    expect(link('Roles')).toBeNull()
    expect(link('History')).toBeNull()
  })

  it('groups links under their headings', () => {
    renderNav(admin, '/dashboard')
    const users = link('Users')!
    expect(users.closest('[data-sidebar="group"]')).not.toBeNull()
    expect(
      within(users.closest('[data-sidebar="group"]') as HTMLElement).getByText('Admin'),
    ).toBeInTheDocument()
  })
})
