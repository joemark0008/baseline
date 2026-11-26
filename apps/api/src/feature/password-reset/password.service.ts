import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { recordAccessChange } from '../access/access-change.js'
import { AuthPasswords } from '../../auth/auth-passwords.js'
import { assertPasswordPolicy } from '../../auth/password.js'
import { PrismaService } from '../../prisma/prisma.service.js'

/** A signed-in person changing their own password (feature 002, User Story 2). */
@Injectable()
export class PasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: AuthPasswords,
  ) {}

  /** Keeps the session in use (`sessionToken`) and ends every other one. */
  async change(
    userId: string,
    sessionToken: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    if (!(await this.passwords.hasPassword(userId))) {
      throw new BadRequestException('You sign in with Google and have no password to change')
    }
    assertPasswordPolicy(newPassword)
    if (!(await this.passwords.verify(userId, currentPassword))) {
      throw new BadRequestException('Your current password is incorrect.')
    }
    const person = await this.prisma.client.user.findUnique({ where: { id: userId } })
    if (!person) throw new NotFoundException('User not found')
    await this.passwords.setPassword(userId, newPassword)
    await this.passwords.signOutOthers(userId, sessionToken)
    await this.prisma.client.$transaction((tx) =>
      recordAccessChange(tx, {
        actorId: userId,
        kind: 'PASSWORD_CHANGED',
        userId,
        after: { user: person.name },
      }),
    )
    return true
  }
}
