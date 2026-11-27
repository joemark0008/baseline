import { Args, ID, Mutation, Resolver } from '@nestjs/graphql'
import { Session } from '@thallesp/nestjs-better-auth'
import { RequirePermission } from '../access/require-permission.decorator.js'
import type { AuthSession } from '../../auth/auth.config.js'
import { AddPhaseInput, UpdatePhaseInput } from './dto/phase.input.js'
import { ProjectPhase } from './entities/project.entity.js'
import { PhasesService } from './phases.service.js'

@Resolver(() => ProjectPhase)
export class PhasesResolver {
  constructor(private readonly phases: PhasesService) {}

  @Mutation(() => ProjectPhase, { description: 'Managers only.' })
  @RequirePermission('projects', 'view')
  addProjectPhase(
    @Args('input') input: AddPhaseInput,
    @Session() session: AuthSession,
  ): Promise<ProjectPhase> {
    return this.phases.add(input, session.user.id)
  }

  @Mutation(() => ProjectPhase, { description: 'Managers only.' })
  @RequirePermission('projects', 'view')
  updateProjectPhase(
    @Args('input') input: UpdatePhaseInput,
    @Session() session: AuthSession,
  ): Promise<ProjectPhase> {
    return this.phases.update(input, session.user.id)
  }

  @Mutation(() => [ProjectPhase], { description: 'Managers only; list every phase once.' })
  @RequirePermission('projects', 'view')
  reorderProjectPhases(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('phaseIds', { type: () => [ID] }) phaseIds: string[],
    @Session() session: AuthSession,
  ): Promise<ProjectPhase[]> {
    return this.phases.reorder(projectId, phaseIds, session.user.id)
  }

  @Mutation(() => Boolean, {
    description: 'Managers only; the phase must have no tasks or deliverables.',
  })
  @RequirePermission('projects', 'view')
  removeProjectPhase(
    @Args('id', { type: () => ID }) id: string,
    @Session() session: AuthSession,
  ): Promise<boolean> {
    return this.phases.remove(id, session.user.id)
  }
}
