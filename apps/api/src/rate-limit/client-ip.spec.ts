import { clientIp } from './client-ip.js'

const HEADERS = ['cf-connecting-ip', 'x-forwarded-for']

describe('clientIp', () => {
  it('takes the first configured header holding exactly one valid address', () => {
    expect(clientIp({ 'cf-connecting-ip': '203.0.113.9' }, HEADERS, '10.0.0.1')).toBe('203.0.113.9')
    expect(clientIp({ 'x-forwarded-for': ' 2001:db8::1 ' }, HEADERS, '10.0.0.1')).toBe(
      '2001:db8::1',
    )
  })

  it('honours the header order', () => {
    const headers = { 'x-forwarded-for': '198.51.100.7', 'cf-connecting-ip': '203.0.113.9' }
    expect(clientIp(headers, HEADERS)).toBe('203.0.113.9')
    expect(clientIp(headers, ['x-forwarded-for'])).toBe('198.51.100.7')
  })

  it('ignores a multi-address chain and an invalid value, then falls back', () => {
    expect(clientIp({ 'x-forwarded-for': '203.0.113.9, 172.16.0.1' }, HEADERS, '10.0.0.1')).toBe(
      '10.0.0.1',
    )
    expect(clientIp({ 'cf-connecting-ip': 'not-an-ip' }, HEADERS, '10.0.0.1')).toBe('10.0.0.1')
    expect(clientIp({ 'cf-connecting-ip': ['1.1.1.1', '2.2.2.2'] }, HEADERS, '10.0.0.1')).toBe(
      '10.0.0.1',
    )
  })

  it('returns unknown when nothing usable exists', () => {
    expect(clientIp({}, HEADERS)).toBe('unknown')
    expect(clientIp({}, HEADERS, '')).toBe('unknown')
  })

  it('unwraps IPv4-mapped IPv6 addresses', () => {
    expect(clientIp({}, HEADERS, '::ffff:127.0.0.1')).toBe('127.0.0.1')
    expect(clientIp({ 'cf-connecting-ip': '::ffff:203.0.113.9' }, HEADERS)).toBe('203.0.113.9')
    expect(clientIp({}, HEADERS, '::1')).toBe('::1')
  })
})
