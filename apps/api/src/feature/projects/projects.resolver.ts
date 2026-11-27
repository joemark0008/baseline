import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Session } from '@thallesp/nestjs-better-auth'
import { RequirePermission } from '../access/require-permission.decorator.js'
import type { AuthSession } from '../../auth/auth.config.js'
import {
  CreateProjectInput,
  InviteProjectMemberInput,
  ProjectActivityArgs,
  ProjectsListArgs,
  UpdateProjectInput,
} from './dto/project.input.js'
import { AddStakeholderInput, UpdateStakeholderInput } from './dto/stakeholder.input.js'
import { ProjectActivityPage } from './entities/activity.entity.js'
import { ProjectRole } from './entities/enums.js'
import { PersonSummary } from './entities/person-summary.entity.js'
import {
  Project,
  ProjectInvite,
  ProjectStakeholder,
  ProjectsPage,
} from './entities/project.entity.js'
import { ProjectsService } from './projects.service.js'
import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class InviteProjectMemberResult {
  @Field(() => ProjectInvite, {
    nullable: true,
    description: 'The pending invite, when an email invite was sent.',
  })
  invite: ProjectInvite | null
  @Field(() => ID, {
    nullable: true,
    description: 'Set when an existing account was added directly.',
  })
  joinedUserId: string | null
  @Field() emailSent: boolean
}

@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private readonly service: ProjectsService) {}

  @Query(() => ProjectsPage, {
    description: 'Projects you belong to, most recently updated first. Needs projects:view.',
  })
  @RequirePermission('projects', 'view')
  projects(@Args() args: ProjectsListArgs, @Session() session: AuthSession): Promise<ProjectsPage> {
    return this.service.listMine(session.user.id, args, args.sort)
  }

  @Query(() => Project, { description: 'One project you belong to. Not found otherwise.' })
  @RequirePermission('projects', 'view')
  project(
    @Args('id', { type: () => ID }) id: string,
    @Session() session: AuthSession,
  ): Promise<Project> {
    return this.service.get(id, session.user.id)
  }

  @Query(() => ProjectActivityPage, {
    description: 'Who changed what, newest first. Members only.',
  })
  @RequirePermission('projects', 'view')
  projectActivity(
    @Args() args: ProjectActivityArgs,
    @Session() session: AuthSession,
  ): Promise<ProjectActivityPage> {
    return this.service.activity(args.projectId, session.user.id, args, args.targetId)
  }

  @Query(() => [PersonSummary], {
    description: 'Active accounts not yet in the project. Managers only.',
  })
  @RequirePermission('projects', 'view')
  projectMemberCandidates(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('search', { type: () => String, nullable: true }) search: string | null,
    @Session() session: AuthSession,
  ): Promise<PersonSummary[]> {
    return this.service.memberCandidates(projectId, search ?? '', session.user.id)
  }

  @Mutation(() => Project, {
    description:
      'Create a project from the standard template; you become its Manager. Needs projects:add.',
  })
  @RequirePermission('projects', 'add')
  createProject(
    @Args('input') input: CreateProjectInput,
    @Session() session: AuthSession,
  ): Promise<Project> {
    return this.service.create(input, session.user.id)
  }

  @Mutation(() => Project, { description: 'Managers only.' })
  @RequirePermission('projects', 'view')
  updateProject(
    @Args('input') input: UpdateProjectInput,
    @Session() session: AuthSession,
  ): Promise<Project> {
    return this.service.update(input, session.user.id)
  }

  @Mutation(() => Project, { description: 'Add an existing account. Managers only.' })
  @RequirePermission('projects', 'view')
  addProjectMember(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('userId', { type: () => ID }) userId: string,
    @Args('role', { type: () => ProjectRole }) role: ProjectRole,
    @Session() session: AuthSession,
  ): Promise<Project> {
    return this.service.addMember(projectId, userId, role, session.user.id)
  }

  @Mutation(() => InviteProjectMemberResult, {
    description:
      'Add by email: an existing account joins now, anyone else is emailed an invite. Managers only.',
  })
  @RequirePermission('projects', 'view')
  inviteProjectMember(
    @Args('input') input: InviteProjectMemberInput,
    @Session() session: AuthSession,
  ): Promise<InviteProjectMemberResult> {
    return this.service.inviteMember(input, session.user.id)
  }

  @Mutation(() => Project, { description: 'Managers only; a project keeps at least one Manager.' })
  @RequirePermission('projects', 'view')
  setProjectMemberRole(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('userId', { type: () => ID }) userId: string,
    @Args('role', { type: () => ProjectRole }) role: ProjectRole,
    @Session() session: AuthSession,
  ): Promise<Project> {
    return this.service.setMemberRole(projectId, userId, role, session.user.id)
  }

  @Mutation(() => Project, { description: 'Managers only; a project keeps at least one Manager.' })
  @RequirePermission('projects', 'view')
  removeProjectMember(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('userId', { type: () => ID }) userId: string,
    @Session() session: AuthSession,
  ): Promise<Project> {
    return this.service.removeMember(projectId, userId, session.user.id)
  }

  @Mutation(() => ProjectStakeholder, { description: 'Managers only.' })
  @RequirePermission('projects', 'view')
  addProjectStakeholder(
    @Args('input') input: AddStakeholderInput,
    @Session() session: AuthSession,
  ): Promise<ProjectStakeholder> {
    return this.service.addStakeholder(input, session.user.id)
  }

  @Mutation(() => ProjectStakeholder, { description: 'Managers only.' })
  @RequirePermission('projects', 'view')
  updateProjectStakeholder(
    @Args('input') input: UpdateStakeholderInput,
    @Session() session: AuthSession,
  ): Promise<ProjectStakeholder> {
    return this.service.updateStakeholder(input, session.user.id)
  }

  @Mutation(() => Boolean, { description: 'Managers only.' })
  @RequirePermission('projects', 'view')
  removeProjectStakeholder(
    @Args('id', { type: () => ID }) id: string,
    @Session() session: AuthSession,
  ): Promise<boolean> {
    return this.service.removeStakeholder(id, session.user.id)
  }
}
