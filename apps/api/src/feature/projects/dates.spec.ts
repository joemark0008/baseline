import { BadRequestException } from '@nestjs/common'
import { assertDateOrder, fromIsoDate, isOverdue, toIsoDate, todayIso } from './dates.js'

describe('calendar dates', () => {
  it('round-trips YYYY-MM-DD through a UTC Date without shifting the day', () => {
    const date = fromIsoDate('2026-12-03')
    expect(date?.toISOString()).toBe('2026-12-03T00:00:00.000Z')
    expect(toIsoDate(date)).toBe('2026-12-03')
    expect(fromIsoDate(null)).toBeNull()
    expect(toIsoDate(null)).toBeNull()
  })

  it('refuses malformed and impossible dates', () => {
    expect(() => fromIsoDate('2026-13-01')).toThrow(BadRequestException)
    expect(() => fromIsoDate('03/12/2026')).toThrow(BadRequestException)
    expect(() => fromIsoDate('2026-02-30')).toThrow(BadRequestException)
  })

  it('treats a task as overdue only when due before today and not complete', () => {
    const today = todayIso(new Date('2026-11-27T10:00:00Z'))
    expect(today).toBe('2026-11-27')
    expect(isOverdue('2026-11-26', 'UPCOMING', today)).toBe(true)
    expect(isOverdue('2026-11-27', 'UPCOMING', today)).toBe(false)
    expect(isOverdue('2026-11-26', 'COMPLETE', today)).toBe(false)
    expect(isOverdue(null, 'UPCOMING', today)).toBe(false)
  })

  it('enforces start before end with the caller-supplied message', () => {
    expect(() =>
      assertDateOrder('2026-01-02', '2026-01-01', 'Due date must not be before start date'),
    ).toThrow('Due date must not be before start date')
    expect(() => assertDateOrder('2026-01-01', '2026-01-01', 'x')).not.toThrow()
    expect(() => assertDateOrder(null, '2026-01-01', 'x')).not.toThrow()
  })
})
