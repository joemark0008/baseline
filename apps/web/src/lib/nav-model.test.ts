import type { Access } from './access'
import { breadcrumbs, isActive, visibleNav } from './nav-model'

const admin: Access = {
  role: { id: 'a', name: 'Admin', kind: 'ADMIN' },
  permissions: ['users:view', 'roles:view'],
}
const member: Access = { role: { id: 'm', name: 'Member', kind: 'MEMBER' }, permissions: [] }

describe('visibleNav', () => {
  it('shows every group, link and sub-page an admin may use', () => {
    const nav = visibleNav(admin)
    expect(nav.map((g) => g.group)).toEqual(['Main', 'Admin'])
    const settings = nav[0].links.find((l) => l.label === 'Settings')
    expect(settings?.items?.map((i) => i.label)).toEqual(['Account', 'Roles', 'History'])
  })

  it('hides what a member may not use, and drops empty groups', () => {
    const nav = visibleNav(member)
    expect(nav.map((g) => g.group)).toEqual(['Main'])
    const settings = nav[0].links.find((l) => l.label === 'Settings')
    expect(settings?.items?.map((i) => i.label)).toEqual(['Account'])
  })
})

describe('isActive', () => {
  it('matches exactly or by path prefix', () => {
    expect(isActive('/settings', true, '/settings')).toBe(true)
    expect(isActive('/settings', true, '/settings/roles')).toBe(false)
    expect(isActive('/settings/roles', false, '/settings/roles/abc')).toBe(true)
    expect(isActive('/settings/roles', false, '/settings/rolesx')).toBe(false)
  })
})

describe('breadcrumbs', () => {
  const labels = (path: string, access: Access = admin) =>
    breadcrumbs(path, access).map((c) => c.label)

  it('names top-level pages', () => {
    expect(labels('/dashboard')).toEqual(['Dashboard'])
    expect(labels('/admin/users')).toEqual(['Users'])
  })

  it('puts sub-pages under their section', () => {
    expect(labels('/settings')).toEqual(['Settings', 'Account'])
    expect(labels('/settings/roles')).toEqual(['Settings', 'Roles'])
    expect(labels('/settings/roles/history')).toEqual(['Settings', 'History'])
  })

  it('adds a readable crumb for detail pages, never the id', () => {
    expect(labels('/settings/roles/new')).toEqual(['Settings', 'Roles', 'New role'])
    expect(labels('/settings/roles/abc123')).toEqual(['Settings', 'Roles', 'Edit role'])
  })

  it('links every crumb but the last', () => {
    const trail = breadcrumbs('/settings/roles/abc', admin)
    expect(trail.map((c) => c.to)).toEqual(['/settings', '/settings/roles', undefined])
  })

  it('returns nothing for unknown pages', () => {
    expect(labels('/nowhere')).toEqual([])
  })
})
