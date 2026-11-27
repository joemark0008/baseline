import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { RequirePermission } from '../access/require-permission.decorator.js'
import {
  AddTemplateDeliverableInput,
  AddTemplatePhaseInput,
  UpdateTemplatePhaseInput,
} from './dto/template.input.js'
import { TemplateDeliverable, TemplatePhase } from './entities/template.entity.js'
import { TemplateService } from './template.service.js'

@Resolver(() => TemplatePhase)
export class TemplateResolver {
  constructor(private readonly template: TemplateService) {}

  @Query(() => [TemplatePhase], {
    description: 'The standard implementation lifecycle, in order. Needs projects:view.',
  })
  @RequirePermission('projects', 'view')
  implementationTemplate(): Promise<TemplatePhase[]> {
    return this.template.list()
  }

  @Mutation(() => TemplatePhase, { description: 'Needs projects:edit.' })
  @RequirePermission('projects', 'edit')
  addTemplatePhase(@Args('input') input: AddTemplatePhaseInput): Promise<TemplatePhase> {
    return this.template.addPhase(input)
  }

  @Mutation(() => TemplatePhase, { description: 'Needs projects:edit.' })
  @RequirePermission('projects', 'edit')
  updateTemplatePhase(@Args('input') input: UpdateTemplatePhaseInput): Promise<TemplatePhase> {
    return this.template.updatePhase(input)
  }

  @Mutation(() => [TemplatePhase], { description: 'Needs projects:edit.' })
  @RequirePermission('projects', 'edit')
  reorderTemplatePhases(
    @Args('ids', { type: () => [ID] }) ids: string[],
  ): Promise<TemplatePhase[]> {
    return this.template.reorderPhases(ids)
  }

  @Mutation(() => Boolean, { description: 'Needs projects:edit.' })
  @RequirePermission('projects', 'edit')
  removeTemplatePhase(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.template.removePhase(id)
  }

  @Mutation(() => TemplateDeliverable, { description: 'Needs projects:edit.' })
  @RequirePermission('projects', 'edit')
  addTemplateDeliverable(
    @Args('input') input: AddTemplateDeliverableInput,
  ): Promise<TemplateDeliverable> {
    return this.template.addDeliverable(input)
  }

  @Mutation(() => Boolean, { description: 'Needs projects:edit.' })
  @RequirePermission('projects', 'edit')
  removeTemplateDeliverable(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.template.removeDeliverable(id)
  }
}
