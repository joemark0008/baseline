import { isIP } from 'node:net'

export type HeaderBag = Record<string, string | string[] | undefined>

/** Express/Node lower-case header names; a header may repeat as an array. */
function headerValue(headers: HeaderBag, name: string): string | undefined {
  const raw = headers[name.toLowerCase()]
  return Array.isArray(raw) ? raw.join(',') : raw
}

/** `::ffff:203.0.113.9` → `203.0.113.9` so logs and keys read naturally. */
function normalize(ip: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)
  return mapped && isIP(mapped[1]) === 4 ? mapped[1] : ip
}

/**
 * The caller's address for rate limiting: the first configured header whose value is exactly one
 * valid IP (a multi-address chain is ignored because its first entry is client-controlled), else
 * `fallback` (Express's `req.ip`, which already honours `trust proxy`), else `unknown`.
 */
export function clientIp(
  headers: HeaderBag,
  headerNames: readonly string[],
  fallback?: string | null,
): string {
  for (const name of headerNames) {
    const value = headerValue(headers, name)
    if (typeof value !== 'string') continue
    const parts = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 1 && isIP(parts[0]) !== 0) return normalize(parts[0])
  }
  return fallback ? normalize(fallback) : 'unknown'
}
