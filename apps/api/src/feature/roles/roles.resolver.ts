import { NotFoundException } from '@nestjs/common'
import { Args, Context, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { Session } from '@thallesp/nestjs-better-auth'
import { AccessService } from '../access/access.service.js'
import { roleCapabilities, type RoleCaps } from '../access/capabilities.js'
import { RoleCapabilities } from '../access/entities/capabilities.entity.js'
import { RoleSummary } from '../access/entities/role-summary.entity.js'
import { RequirePermission } from '../access/require-permission.decorator.js'
import type { AuthSession } from '../../auth/auth.config.js'
import { PageArgs } from '../../common/pagination/page-args.js'
import { User } from '../users/entities/user.entity.js'
import { UsersService } from '../users/users.service.js'
import { AccessChangesPage } from './dto/access-changes-page.output.js'
import { CreateRoleInput } from './dto/create-role.input.js'
import { SetUserRoleInput } from './dto/set-user-role.input.js'
import { UpdateRoleInput } from './dto/update-role.input.js'
import { Role } from './entities/role.entity.js'
import { RolesService } from './roles.service.js'

type GqlReq = { session: { user: { id: string } } }

@Resolver(() => Role)
export class RolesResolver {
  constructor(
    private readonly rolesService: RolesService,
    private readonly access: AccessService,
    private readonly usersService: UsersService,
  ) {}

  @Query(() => [Role], { description: 'Every role. Needs roles:view.' })
  @RequirePermission('roles', 'view')
  roles(): Promise<Role[]> {
    return this.rolesService.list()
  }

  @Query(() => Role, { description: 'One role. Needs roles:view.' })
  @RequirePermission('roles', 'view')
  role(@Args('id', { type: () => ID }) id: string): Promise<Role> {
    return this.rolesService.get(id)
  }

  @Query(() => [RoleSummary], {
    description: 'Roles you may invite people into, default first. Needs invites:add.',
  })
  @RequirePermission('invites', 'add')
  inviteRoles(@Context('req') req: GqlReq): Promise<RoleSummary[]> {
    return this.assignable(req)
  }

  @Query(() => [RoleSummary], {
    description: 'Roles you may move people into, default first. Needs roles:edit.',
  })
  @RequirePermission('roles', 'edit')
  assignableRoles(@Context('req') req: GqlReq): Promise<RoleSummary[]> {
    return this.assignable(req)
  }

  @ResolveField(() => RoleCapabilities)
  async can(@Parent() role: Role, @Context('req') req: GqlReq): Promise<RoleCaps> {
    return roleCapabilities(await this.access.forRequest(req, req.session.user.id), role)
  }

  @Query(() => AccessChangesPage, {
    description: 'Access history, newest first. Needs roles:view.',
  })
  @RequirePermission('roles', 'view')
  accessChanges(@Args() pageArgs: PageArgs): Promise<AccessChangesPage> {
    return this.rolesService.accessChanges(pageArgs)
  }

  @Mutation(() => Role, { description: 'Needs roles:add.' })
  @RequirePermission('roles', 'add')
  createRole(
    @Args('input') input: CreateRoleInput,
    @Session() session: AuthSession,
  ): Promise<Role> {
    return this.rolesService.create(input, session.user.id)
  }

  @Mutation(() => Role, { description: 'Needs roles:edit.' })
  @RequirePermission('roles', 'edit')
  updateRole(
    @Args('input') input: UpdateRoleInput,
    @Session() session: AuthSession,
  ): Promise<Role> {
    return this.rolesService.update(input, session.user.id)
  }

  @Mutation(() => Boolean, { description: 'Deletes an unused custom role. Needs roles:delete.' })
  @RequirePermission('roles', 'delete')
  deleteRole(
    @Args('id', { type: () => ID }) id: string,
    @Session() session: AuthSession,
  ): Promise<boolean> {
    return this.rolesService.delete(id, session.user.id)
  }

  @Mutation(() => User, { description: 'Put a person in a role. Needs roles:edit.' })
  @RequirePermission('roles', 'edit')
  async setUserRole(
    @Args('input') input: SetUserRoleInput,
    @Session() session: AuthSession,
  ): Promise<User> {
    await this.access.setUserRole(session.user.id, input.userId, input.roleId)
    const user = await this.usersService.findById(input.userId)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  /** Roles the caller may put people in (Admin only for Admins), Member first as the default. */
  private async assignable(req: GqlReq): Promise<RoleSummary[]> {
    const caller = await this.access.forRequest(req, req.session.user.id)
    const roles = (await this.rolesService.list()).filter((r) => roleCapabilities(caller, r).assign)
    roles.sort((a, b) => Number(b.kind === 'MEMBER') - Number(a.kind === 'MEMBER'))
    return roles.map(({ id, name, kind }) => ({ id, name, kind }))
  }
}
