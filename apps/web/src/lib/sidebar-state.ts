/** Name of the cookie the catalog sidebar writes when it is collapsed or expanded. */
export const SIDEBAR_COOKIE = 'sidebar_state'

/** Whether the desktop sidebar starts open, read back from its cookie; open by default. */
export function readSidebarOpen(cookie: string): boolean {
  const value = cookie
    .split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === SIDEBAR_COOKIE)?.[1]
  return value !== 'false'
}
