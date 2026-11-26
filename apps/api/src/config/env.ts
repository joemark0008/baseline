/** Typed process environment. Fails fast on missing required values. */
export interface AppEnv {
  nodeEnv: 'development' | 'test' | 'production'
  port: number
  databaseUrl: string
  betterAuthSecret: string
  betterAuthUrl: string
  /** Browser origins allowed for CORS and Better Auth trusted origins. */
  webOrigins: string[]
  /** Cookie domain shared by api and web subdomains (e.g. `.example.com`). */
  cookieDomain?: string
  google?: { clientId: string; clientSecret: string }
  /** Attempts per window for each limit group (feature 003-rate-limiting). */
  rateLimit: RateLimitSettings
  /** Request headers the caller's address is read from, in order, lower-cased. */
  clientIpHeaders: string[]
  /** Email delivery (feature 008). Without an API key, emails go to the log. */
  email: EmailSettings
}

export interface EmailSettings {
  /** Resend API key; unset selects the log transport. */
  resendApiKey?: string
  /** Sender as shown to recipients, e.g. `Baseline <no-reply@example.com>`. */
  from: string
  replyTo?: string
}

/** Resend's test sender: delivers only to the Resend account's own addresses. */
export const DEFAULT_EMAIL_FROM = 'baseline <onboarding@resend.dev>'

export interface RateLimitRule {
  max: number
  windowSeconds: number
}

export interface RateLimitSettings {
  signIn: RateLimitRule
  links: RateLimitRule
  general: RateLimitRule
}

export const DEFAULT_RATE_LIMITS: RateLimitSettings = {
  signIn: { max: 5, windowSeconds: 60 },
  links: { max: 10, windowSeconds: 60 },
  general: { max: 300, windowSeconds: 60 },
}

export const DEFAULT_CLIENT_IP_HEADERS = ['cf-connecting-ip', 'x-forwarded-for']

export const APP_ENV = Symbol('APP_ENV')

type Source = Record<string, string | undefined>

function required(source: Source, key: string): string {
  const value = source[key]
  if (!value) throw new Error(`Missing required environment variable ${key}`)
  return value
}

/** Unset or empty keeps the default; anything that is not a whole number >= 1 stops the boot. */
function positiveInt(source: Source, key: string, fallback: number): number {
  const raw = source[key]?.trim()
  if (!raw) return fallback
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    throw new Error(`Invalid environment variable ${key}: expected a positive whole number`)
  }
  return Number(raw)
}

function rateLimitRule(source: Source, prefix: string, defaults: RateLimitRule): RateLimitRule {
  return {
    max: positiveInt(source, `${prefix}_MAX`, defaults.max),
    windowSeconds: positiveInt(source, `${prefix}_WINDOW`, defaults.windowSeconds),
  }
}

function list(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function loadEnv(source: Source = process.env): AppEnv {
  const nodeEnv = (source.NODE_ENV ?? 'development') as AppEnv['nodeEnv']
  const webOrigins = (source.WEB_ORIGINS ?? 'http://localhost:4173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const google =
    source.GOOGLE_CLIENT_ID && source.GOOGLE_CLIENT_SECRET
      ? { clientId: source.GOOGLE_CLIENT_ID, clientSecret: source.GOOGLE_CLIENT_SECRET }
      : undefined
  return {
    nodeEnv,
    port: Number(source.PORT ?? 3001),
    databaseUrl: required(source, 'DATABASE_URL'),
    betterAuthSecret: required(source, 'BETTER_AUTH_SECRET'),
    betterAuthUrl: source.BETTER_AUTH_URL ?? `http://localhost:${source.PORT ?? 3001}`,
    webOrigins,
    cookieDomain: source.COOKIE_DOMAIN || undefined,
    google,
    rateLimit: {
      signIn: rateLimitRule(source, 'RATE_LIMIT_SIGN_IN', DEFAULT_RATE_LIMITS.signIn),
      links: rateLimitRule(source, 'RATE_LIMIT_LINKS', DEFAULT_RATE_LIMITS.links),
      general: rateLimitRule(source, 'RATE_LIMIT_GENERAL', DEFAULT_RATE_LIMITS.general),
    },
    clientIpHeaders: list(source.CLIENT_IP_HEADERS, DEFAULT_CLIENT_IP_HEADERS),
    email: {
      resendApiKey: source.RESEND_API_KEY?.trim() || undefined,
      from: source.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM,
      replyTo: source.EMAIL_REPLY_TO?.trim() || undefined,
    },
  }
}
