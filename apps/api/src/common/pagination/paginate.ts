import { DEFAULT_PER_PAGE, type PageArgs } from './page-args.js'
import type { PageMeta } from './page-meta.output.js'

/** Resolves defaults and returns the Prisma `skip`/`take` for a page request. */
export function toPageQuery(args: PageArgs = {}): {
  page: number
  perPage: number
  skip: number
  take: number
} {
  const page = args.page ?? 1
  const perPage = args.perPage ?? DEFAULT_PER_PAGE
  return { page, perPage, skip: (page - 1) * perPage, take: perPage }
}

/** Builds the `meta` block of a page. An empty result is still "page 1 of 1". */
export function buildPageMeta(total: number, page: number, perPage: number): PageMeta {
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  return {
    total,
    lastPage,
    currentPage: page,
    perPage,
    prev: page > 1 ? page - 1 : null,
    next: page < lastPage ? page + 1 : null,
    hasNextPage: page < lastPage,
    hasPrevPage: page > 1,
  }
}
