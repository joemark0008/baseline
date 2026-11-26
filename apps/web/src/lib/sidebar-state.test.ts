import { readSidebarOpen } from './sidebar-state'

describe('readSidebarOpen', () => {
  it('is open by default', () => {
    expect(readSidebarOpen('')).toBe(true)
    expect(readSidebarOpen('theme=dark')).toBe(true)
  })

  it('follows the remembered choice', () => {
    expect(readSidebarOpen('sidebar_state=false')).toBe(false)
    expect(readSidebarOpen('a=1; sidebar_state=false; b=2')).toBe(false)
    expect(readSidebarOpen('sidebar_state=true')).toBe(true)
  })
})
