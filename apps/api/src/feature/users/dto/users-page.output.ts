import { ObjectType } from '@nestjs/graphql'
import { Paginated } from '../../../common/pagination/paginated.output.js'
import { User } from '../entities/user.entity.js'

@ObjectType()
export class UsersPage extends Paginated(User) {}
