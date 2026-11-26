import { NotFoundException } from '@nestjs/common'
import { Args, Context, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'
import { Session } from '@thallesp/nestjs-better-auth'
import { AccessService } from '../access/access.service.js'
import { userCapabilities, type UserCaps } from '../access/capabilities.js'
import { UserCapabilities } from '../access/entities/capabilities.entity.js'
import { RequirePermission } from '../access/require-permission.decorator.js'
import type { AuthSession } from '../auth/auth.config.js'
import { AuthPasswords } from '../auth/auth-passwords.js'
import { PageArgs } from '../common/pagination/page-args.js'
import { PasswordResetService } from '../password-reset/password-reset.service.js'
import { UpdateUserInput } from './dto/update-user.input.js'
import { UsersPage } from './dto/users-page.output.js'
import { User } from './entities/user.entity.js'
import { UsersService } from './users.service.js'

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly access: AccessService,
    private readonly passwords: AuthPasswords,
    private readonly resets: PasswordResetService,
  ) {}

  /** Pending reset links, loaded once per request for the whole list. */
  private readonly pendingByRequest = new WeakMap<object, Promise<Map<string, Date>>>()

  @ResolveField(() => Date, {
    nullable: true,
    description: "When this person's pending password reset link expires. Admin callers only.",
  })
  async passwordResetExpiresAt(
    @Parent() user: User,
    @Context('req') req: { session: { user: { id: string } } },
  ): Promise<Date | null> {
    const caller = await this.access.forRequest(req, req.session.user.id)
    if (caller.role.kind !== 'ADMIN') return null
    let pending = this.pendingByRequest.get(req)
    if (!pending) {
      pending = this.resets.pendingExpiryFor()
      this.pendingByRequest.set(req, pending)
    }
    return (await pending).get(user.id) ?? null
  }

  @ResolveField(() => UserCapabilities)
  async can(
    @Parent() user: User,
    @Context('req') req: { session: { user: { id: string } } },
  ): Promise<UserCaps> {
    const callerId = req.session.user.id
    const caller = await this.access.forRequest(req, callerId)
    // Only your own record can offer "Change password", so look up just that one account.
    const hasPassword = user.id === callerId ? await this.passwords.hasPassword(callerId) : false
    return userCapabilities(callerId, caller, {
      id: user.id,
      kind: user.accessRole.kind,
      deactivated: user.deactivated,
      hasPassword,
    })
  }

  @Query(() => User, { description: 'The signed-in person.' })
  async me(@Session() session: AuthSession): Promise<User> {
    const user = await this.usersService.findById(session.user.id)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  @Query(() => UsersPage, { description: 'Paginated user list. Needs users:view.' })
  @RequirePermission('users', 'view')
  findAllUsers(@Args() pageArgs: PageArgs): Promise<UsersPage> {
    return this.usersService.findAll(pageArgs)
  }

  @Mutation(() => User, { description: "Change a person's name or username. Needs users:edit." })
  @RequirePermission('users', 'edit')
  updateUser(@Args('input') input: UpdateUserInput): Promise<User> {
    return this.usersService.updateUser(input)
  }

  @Mutation(() => User, {
    description: 'Sign a person out and block sign-in. Needs users:delete.',
  })
  @RequirePermission('users', 'delete')
  deactivateUser(
    @Args('id', { type: () => ID }) id: string,
    @Session() session: AuthSession,
  ): Promise<User> {
    return this.usersService.deactivateUser(session.user.id, id)
  }

  @Mutation(() => User, { description: 'Let a deactivated person sign in again. Admin role only.' })
  reactivateUser(
    @Args('id', { type: () => ID }) id: string,
    @Session() session: AuthSession,
  ): Promise<User> {
    return this.usersService.reactivateUser(session.user.id, id)
  }
}
