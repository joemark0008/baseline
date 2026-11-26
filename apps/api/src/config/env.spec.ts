import { loadEnv } from './env.js'

const base = { DATABASE_URL: 'postgres://x', BETTER_AUTH_SECRET: 's' }

describe('loadEnv', () => {
  it('applies development defaults', () => {
    const env = loadEnv(base)
    expect(env.port).toBe(3001)
    expect(env.webOrigins).toEqual(['http://localhost:4173'])
    expect(env.betterAuthUrl).toBe('http://localhost:3001')
    expect(env.google).toBeUndefined()
  })

  it('fails fast on a missing required variable', () => {
    expect(() => loadEnv({ BETTER_AUTH_SECRET: 's' })).toThrow(/DATABASE_URL/)
  })

  it('parses comma-separated origins and google only when both values are set', () => {
    const env = loadEnv({
      ...base,
      WEB_ORIGINS: 'https://a.test, https://b.test',
      GOOGLE_CLIENT_ID: 'id',
    })
    expect(env.webOrigins).toEqual(['https://a.test', 'https://b.test'])
    expect(env.google).toBeUndefined()
    expect(
      loadEnv({ ...base, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'sec' }).google,
    ).toEqual({
      clientId: 'id',
      clientSecret: 'sec',
    })
  })

  describe('rate limits (feature 003)', () => {
    it('applies the defaults when nothing is set', () => {
      const env = loadEnv(base)
      expect(env.rateLimit).toEqual({
        signIn: { max: 5, windowSeconds: 60 },
        links: { max: 10, windowSeconds: 60 },
        general: { max: 300, windowSeconds: 60 },
      })
      expect(env.clientIpHeaders).toEqual(['cf-connecting-ip', 'x-forwarded-for'])
    })

    it('applies each override on its own and keeps the other defaults', () => {
      expect(loadEnv({ ...base, RATE_LIMIT_SIGN_IN_MAX: '2' }).rateLimit.signIn).toEqual({
        max: 2,
        windowSeconds: 60,
      })
      expect(loadEnv({ ...base, RATE_LIMIT_LINKS_WINDOW: '15' }).rateLimit.links).toEqual({
        max: 10,
        windowSeconds: 15,
      })
      expect(loadEnv({ ...base, RATE_LIMIT_GENERAL_MAX: '1000' }).rateLimit.general.max).toBe(1000)
      expect(loadEnv({ ...base, RATE_LIMIT_GENERAL_MAX: '' }).rateLimit.general.max).toBe(300)
    })

    it.each(['0', '-1', '1.5', 'abc'])('refuses %s and names the variable', (value) => {
      expect(() => loadEnv({ ...base, RATE_LIMIT_SIGN_IN_MAX: value })).toThrow(
        'Invalid environment variable RATE_LIMIT_SIGN_IN_MAX: expected a positive whole number',
      )
    })

    it('splits, trims and lower-cases CLIENT_IP_HEADERS', () => {
      expect(
        loadEnv({ ...base, CLIENT_IP_HEADERS: ' X-Real-IP, ,cf-connecting-ip ' }).clientIpHeaders,
      ).toEqual(['x-real-ip', 'cf-connecting-ip'])
      expect(loadEnv({ ...base, CLIENT_IP_HEADERS: '' }).clientIpHeaders).toEqual([
        'cf-connecting-ip',
        'x-forwarded-for',
      ])
    })
  })
})
