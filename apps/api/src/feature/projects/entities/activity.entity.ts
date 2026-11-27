import { Field, ID, ObjectType } from '@nestjs/graphql'
import { Paginated } from '../../../common/pagination/paginated.output.js'
import { ProjectActivityKind } from './enums.js'
import { PersonSummary } from './person-summary.entity.js'

@ObjectType()
export class ProjectActivity {
  @Field(() => ID) id: string
  @Field(() => PersonSummary, { nullable: true }) actor: PersonSummary | null
  @Field(() => ProjectActivityKind) kind: ProjectActivityKind
  @Field() summary: string
  @Field(() => String, { nullable: true }) targetType: string | null
  @Field(() => ID, { nullable: true }) targetId: string | null
  @Field() createdAt: Date
}

@ObjectType()
export class ProjectActivityPage extends Paginated(ProjectActivity) {}
