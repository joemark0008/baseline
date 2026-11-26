import { type Type } from '@nestjs/common'
import { Field, ObjectType } from '@nestjs/graphql'
import { PageMeta } from './page-meta.output.js'

export interface Page<T> {
  data: T[]
  meta: PageMeta
}

/** Generic page type: `@ObjectType() class UsersPage extends Paginated(User) {}`. */
export function Paginated<T>(itemType: Type<T>): Type<Page<T>> {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType implements Page<T> {
    @Field(() => [itemType]) data: T[]
    @Field(() => PageMeta) meta: PageMeta
  }
  return PaginatedType as Type<Page<T>>
}
