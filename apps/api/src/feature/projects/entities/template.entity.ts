import { Field, ID, Int, ObjectType } from '@nestjs/graphql'
import { DeliverableKind } from './enums.js'

@ObjectType()
export class TemplateDeliverable {
  @Field(() => ID) id: string
  @Field() title: string
  @Field(() => DeliverableKind) kind: DeliverableKind
  @Field(() => Int) order: number
}

/** One stage of the standard lifecycle; copied into every new project (FR-002). */
@ObjectType()
export class TemplatePhase {
  @Field(() => ID) id: string
  @Field() name: string
  @Field(() => String, { nullable: true }) description: string | null
  @Field(() => Int) order: number
  @Field(() => [TemplateDeliverable]) deliverables: TemplateDeliverable[]
}
