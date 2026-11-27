import { formatDate, initials, label } from './lib'

describe('project helpers', () => {
  it('formats calendar dates without a time-zone shift', () => {
    expect(formatDate('2026-12-03')).toBe('3 Dec 2026')
    expect(formatDate('2026-12-03', false)).toBe('3 Dec')
    expect(formatDate(null)).toBe('—')
  })

  it('labels enum values for people', () => {
    expect(label('IN_PROGRESS')).toBe('In progress')
    expect(label('DATA_CATEGORY')).toBe('Data category')
    expect(label(null)).toBe('—')
  })

  it('builds initials from a name', () => {
    expect(initials('Amina Yusuf')).toBe('AY')
    expect(initials('Bo')).toBe('B')
  })
})
