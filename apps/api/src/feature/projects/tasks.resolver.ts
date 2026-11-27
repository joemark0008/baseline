import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Session } from '@thallesp/nestjs-better-auth'
import { RequirePermission } from '../access/require-permission.decorator.js'
import type { AuthSession } from '../../auth/auth.config.js'
import { TaskFilterArgs } from './dto/project.input.js'
import { AddTaskCommentInput, CreateTaskInput, UpdateTaskInput } from './dto/task.input.js'
import { ProjectTask, TaskComment } from './entities/project.entity.js'
import { TasksService } from './tasks.service.js'

@Resolver(() => ProjectTask)
export class TasksResolver {
  constructor(private readonly tasks: TasksService) {}

  @Query(() => [ProjectTask], { description: 'Tasks of a project, filtered. Members only.' })
  @RequirePermission('projects', 'view')
  projectTasks(
    @Args() filter: TaskFilterArgs,
    @Session() session: AuthSession,
  ): Promise<ProjectTask[]> {
    return this.tasks.list(filter, session.user.id)
  }

  @Query(() => ProjectTask, { description: 'One task with its comments. Members only.' })
  @RequirePermission('projects', 'view')
  projectTask(
    @Args('id', { type: () => ID }) id: string,
    @Session() session: AuthSession,
  ): Promise<ProjectTask> {
    return this.tasks.get(id, session.user.id)
  }

  @Mutation(() => ProjectTask, { description: 'Members only.' })
  @RequirePermission('projects', 'view')
  createProjectTask(
    @Args('input') input: CreateTaskInput,
    @Session() session: AuthSession,
  ): Promise<ProjectTask> {
    return this.tasks.create(input, session.user.id)
  }

  @Mutation(() => ProjectTask, { description: 'Members only.' })
  @RequirePermission('projects', 'view')
  updateProjectTask(
    @Args('input') input: UpdateTaskInput,
    @Session() session: AuthSession,
  ): Promise<ProjectTask> {
    return this.tasks.update(input, session.user.id)
  }

  @Mutation(() => Boolean, { description: 'Members only.' })
  @RequirePermission('projects', 'view')
  deleteProjectTask(
    @Args('id', { type: () => ID }) id: string,
    @Session() session: AuthSession,
  ): Promise<boolean> {
    return this.tasks.delete(id, session.user.id)
  }

  @Mutation(() => TaskComment, {
    description: 'Members only; mentions must be members and are emailed.',
  })
  @RequirePermission('projects', 'view')
  addTaskComment(
    @Args('input') input: AddTaskCommentInput,
    @Session() session: AuthSession,
  ): Promise<TaskComment> {
    return this.tasks.addComment(input, session.user.id)
  }
}
