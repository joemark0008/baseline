import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { AllowAnonymous } from '@thallesp/nestjs-better-auth'
import { CompleteSetupInput } from './dto/complete-setup.input.js'
import { CompleteSetupResult } from './dto/complete-setup.output.js'
import { SetupStatus } from './dto/setup-status.output.js'
import { SetupService } from './setup.service.js'
import { OneTimeLinkOperation } from '../../rate-limit/rate-limit.decorators.js'

/** First-run wizard. Public by necessity: no user exists yet; the setup token is the credential. */
@Resolver()
export class SetupResolver {
  constructor(private readonly setupService: SetupService) {}

  @Query(() => SetupStatus, { description: 'Public: whether first-run setup has been completed.' })
  @AllowAnonymous()
  setupStatus(): Promise<SetupStatus> {
    return this.setupService.status()
  }

  @Mutation(() => CompleteSetupResult, {
    description: 'Public, one time: exchange the setup token for the first admin account.',
  })
  @AllowAnonymous()
  @OneTimeLinkOperation()
  completeSetup(@Args('input') input: CompleteSetupInput): Promise<CompleteSetupResult> {
    return this.setupService.completeSetup(input)
  }
}
