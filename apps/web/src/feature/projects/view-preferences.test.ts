import { readViewPreference, writeViewPreference } from './view-preferences'

describe('view preferences', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips the view and filters per project, dropping the open task', () => {
    writeViewPreference('p1', { view: 'list', search: { owner: 'ada', sort: 'due', task: 't1' } })
    expect(readViewPreference('p1')).toEqual({
      view: 'list',
      search: { owner: 'ada', sort: 'due' },
    })
    expect(readViewPreference('p2')).toEqual({ view: 'board', search: {} })
  })

  it('falls back to the board when storage is empty, corrupt or unavailable', () => {
    localStorage.setItem('baseline.project-view.p3', '{not json')
    expect(readViewPreference('p3')).toEqual({ view: 'board', search: {} })
    localStorage.setItem(
      'baseline.project-view.p4',
      JSON.stringify({ view: 'nope', search: { status: 'X' } }),
    )
    expect(readViewPreference('p4')).toEqual({ view: 'board', search: {} })
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readViewPreference('p1')).toEqual({ view: 'board', search: {} })
    spy.mockRestore()
  })
})
