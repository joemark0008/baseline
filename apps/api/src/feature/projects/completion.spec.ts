import { completionStamp } from './completion.js'

describe('completionStamp (feature 011)', () => {
  const now = new Date('2026-11-27T10:00:00Z')

  it('stamps the moment a task becomes complete', () => {
    expect(completionStamp('UPCOMING', 'COMPLETE', now)).toEqual({ completedAt: now })
    expect(completionStamp(null, 'COMPLETE', now)).toEqual({ completedAt: now })
  })

  it('clears the stamp when a task is reopened', () => {
    expect(completionStamp('COMPLETE', 'IN_PROGRESS', now)).toEqual({ completedAt: null })
  })

  it('leaves the stamp alone when the status does not cross the boundary', () => {
    expect(completionStamp('COMPLETE', 'COMPLETE', now)).toEqual({})
    expect(completionStamp('UPCOMING', 'BLOCKED', now)).toEqual({})
    expect(completionStamp('UPCOMING', 'UPCOMING', now)).toEqual({})
  })

  it('defaults to the current time', () => {
    vi.useFakeTimers({ now })
    expect(completionStamp('UPCOMING', 'COMPLETE')).toEqual({ completedAt: now })
    vi.useRealTimers()
  })
})
