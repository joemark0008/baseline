import { Args, ID, Mutation, Resolver } from '@nestjs/graphql'
import { Session } from '@thallesp/nestjs-better-auth'
import { RequirePermission } from '../access/require-permission.decorator.js'
import type { AuthSession } from '../../auth/auth.config.js'
import { DeliverablesService } from './deliverables.service.js'
import {
  AddDeliverableInput,
  ReviewDeliverableInput,
  UpdateDeliverableInput,
} from './dto/deliverable.input.js'
import { ProjectDeliverable } from './entities/project.entity.js'

@Resolver(() => ProjectDeliverable)
export class DeliverablesResolver {
  constructor(private readonly deliverables: DeliverablesService) {}

  @Mutation(() => ProjectDeliverable, { description: 'Members only.' })
  @RequirePermission('projects', 'view')
  addProjectDeliverable(
    @Args('input') input: AddDeliverableInput,
    @Session() session: AuthSession,
  ): Promise<ProjectDeliverable> {
    return this.deliverables.add(input, session.user.id)
  }

  @Mutation(() => ProjectDeliverable, { description: 'Members only.' })
  @RequirePermission('projects', 'view')
  updateProjectDeliverable(
    @Args('input') input: UpdateDeliverableInput,
    @Session() session: AuthSession,
  ): Promise<ProjectDeliverable> {
    return this.deliverables.update(input, session.user.id)
  }

  @Mutation(() => ProjectDeliverable, {
    description: 'The reviewer or a Manager records the outcome.',
  })
  @RequirePermission('projects', 'view')
  reviewProjectDeliverable(
    @Args('input') input: ReviewDeliverableInput,
    @Session() session: AuthSession,
  ): Promise<ProjectDeliverable> {
    return this.deliverables.review(input, session.user.id)
  }

  @Mutation(() => Boolean, { description: 'Members only.' })
  @RequirePermission('projects', 'view')
  removeProjectDeliverable(
    @Args('id', { type: () => ID }) id: string,
    @Session() session: AuthSession,
  ): Promise<boolean> {
    return this.deliverables.remove(id, session.user.id)
  }
}
