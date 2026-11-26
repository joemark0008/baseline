import { ACCESS_AREAS, assertUniqueKeys, findArea } from './areas.js'

describe('access areas catalogue', () => {
  it('contains the initial areas in order', () => {
    expect(ACCESS_AREAS.map((a) => a.key)).toEqual(['users', 'invites', 'roles'])
  })

  it('finds an area by key', () => {
    expect(findArea('invites')?.name).toBe('Invites')
    expect(findArea('nope')).toBeUndefined()
  })

  it('rejects duplicate keys', () => {
    const a = ACCESS_AREAS[0]
    expect(() => assertUniqueKeys([a, a])).toThrow(/Duplicate area key "users"/)
  })
})
