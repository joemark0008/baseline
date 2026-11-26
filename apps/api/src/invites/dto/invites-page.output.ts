import { ObjectType } from '@nestjs/graphql'
import { Paginated } from '../../common/pagination/paginated.output.js'
import { Invite } from '../entities/invite.entity.js'

@ObjectType()
export class InvitesPage extends Paginated(Invite) {}
