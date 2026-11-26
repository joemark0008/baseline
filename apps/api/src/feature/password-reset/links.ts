/** The web page that sets a new password; the token is the credential and is never stored. */
export function buildResetUrl(webOrigin: string, token: string): string {
  const url = new URL('/reset-password', webOrigin)
  url.searchParams.set('token', token)
  return url.toString()
}
