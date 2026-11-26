import { ObjectType } from '@nestjs/graphql'
import { Paginated } from '../../../common/pagination/paginated.output.js'
import { AccessChange } from '../entities/access-change.entity.js'

@ObjectType()
export class AccessChangesPage extends Paginated(AccessChange) {}
