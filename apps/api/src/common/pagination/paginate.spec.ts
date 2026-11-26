import { buildPageMeta, toPageQuery } from './paginate.js'

describe('pagination helpers', () => {
  it('defaults to page 1 of 10 and computes skip/take', () => {
    expect(toPageQuery()).toEqual({ page: 1, perPage: 10, skip: 0, take: 10 })
    expect(toPageQuery({ page: 3, perPage: 20 })).toEqual({
      page: 3,
      perPage: 20,
      skip: 40,
      take: 20,
    })
  })

  it('builds meta for a middle page', () => {
    expect(buildPageMeta(45, 2, 10)).toEqual({
      total: 45,
      lastPage: 5,
      currentPage: 2,
      perPage: 10,
      prev: 1,
      next: 3,
      hasNextPage: true,
      hasPrevPage: true,
    })
  })

  it('treats an empty result as page 1 of 1', () => {
    expect(buildPageMeta(0, 1, 10)).toMatchObject({
      lastPage: 1,
      prev: null,
      next: null,
      hasNextPage: false,
      hasPrevPage: false,
    })
  })

  it('has no next page on the last page', () => {
    expect(buildPageMeta(30, 3, 10)).toMatchObject({ next: null, hasNextPage: false, prev: 2 })
  })
})
