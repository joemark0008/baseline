import { readViewPreference, writeViewPreference } from './view-preferences'

const DEFAULTS = {
  view: 'board',
  search: {},
  showDone: false,
  collapsed: [],
  boardLayout: 'columns',
}

describe('view preferences', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips the view and filters per project, dropping the open task', () => {
    writeViewPreference('p1', { view: 'list', search: { owner: 'ada', sort: 'due', task: 't1' } })
    expect(readViewPreference('p1')).toEqual({
      ...DEFAULTS,
      view: 'list',
      search: { owner: 'ada', sort: 'due' },
    })
    expect(readViewPreference('p2')).toEqual(DEFAULTS)
  })

  it('falls back to the board when storage is empty, corrupt or unavailable', () => {
    localStorage.setItem('baseline.project-view.p3', '{not json')
    expect(readViewPreference('p3')).toEqual(DEFAULTS)
    localStorage.setItem(
      'baseline.project-view.p4',
      JSON.stringify({ view: 'nope', search: { status: 'X' }, showDone: 'yes', collapsed: 'a' }),
    )
    expect(readViewPreference('p4')).toEqual(DEFAULTS)
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readViewPreference('p1')).toEqual(DEFAULTS)
    spy.mockRestore()
  })

  it('round-trips the readability settings and merges partial writes (feature 011)', () => {
    writeViewPreference('p1', { showDone: true, collapsed: ['ph1', 'ph3'], boardLayout: 'lanes' })
    writeViewPreference('p1', { view: 'timeline', search: { q: 'lab' } })
    expect(readViewPreference('p1')).toEqual({
      view: 'timeline',
      search: { q: 'lab' },
      showDone: true,
      collapsed: ['ph1', 'ph3'],
      boardLayout: 'lanes',
    })
  })

  it('drops folded phases that are no longer in the plan', () => {
    writeViewPreference('p1', { collapsed: ['ph1', 'gone', 7 as unknown as string] })
    expect(readViewPreference('p1', ['ph1', 'ph2']).collapsed).toEqual(['ph1'])
    expect(readViewPreference('p1').collapsed).toEqual(['ph1', 'gone'])
  })
})
