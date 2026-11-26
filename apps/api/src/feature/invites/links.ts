/** The web page that accepts an invite; the token is the credential and is never stored. */
export function buildInviteUrl(webOrigin: string, token: string, email: string): string {
  const url = new URL('/invite', webOrigin)
  url.searchParams.set('token', token)
  url.searchParams.set('email', email)
  return url.toString()
}
