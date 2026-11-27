import { BadRequestException } from '@nestjs/common'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD` → a UTC midnight Date for a `@db.Date` column; null passes through. */
export function fromIsoDate(value: string | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const match = ISO_DATE.exec(value)
  if (!match) throw new BadRequestException(`Invalid date "${value}": expected YYYY-MM-DD`)
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  if (toIsoDate(date) !== value) throw new BadRequestException(`Invalid date "${value}"`)
  return date
}

/** A `@db.Date` value → `YYYY-MM-DD`; null passes through. */
export function toIsoDate(value: Date | null | undefined): string | null {
  if (!value) return null
  return value.toISOString().slice(0, 10)
}

/** Today's calendar date in UTC; `now` is injectable for tests. */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** FR-008: due before today and not complete. ISO strings compare lexicographically. */
export function isOverdue(
  dueDate: string | null,
  status: string,
  today: string = todayIso(),
): boolean {
  return dueDate !== null && status !== 'COMPLETE' && dueDate < today
}

/** FR-009: a range is valid when either side is empty or end is not before start. */
export function assertDateOrder(
  start: string | null | undefined,
  end: string | null | undefined,
  message: string,
): void {
  if (start && end && end < start) throw new BadRequestException(message)
}
