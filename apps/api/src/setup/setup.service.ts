import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common'
import { MIN_PASSWORD_LENGTH } from '../auth/password.js'
import { APP_ENV, type AppEnv } from '../config/env.js'
import { AccessService } from '../access/access.service.js'
import { ADMIN_ROLE_ID } from '../access/role-kind.js'
import { PrismaService } from '../prisma/prisma.service.js'

/** DI token for the Better Auth instance (bound in SetupModule). */
export const AUTH_INSTANCE = Symbol('AUTH_INSTANCE')

/** The one Better Auth call setup needs (admin plugin, trusted server call). */
export interface SetupAuth {
  api: {
    createUser(args: {
      body: { email: string; password: string; name: string; role: 'admin' }
    }): Promise<unknown>
  }
}

export interface CompleteSetupArgs {
  token: string
  name: string
  email: string
  password: string
}

const STATE_ID = 1
const INVALID_TOKEN = 'Invalid setup token. Copy the latest one from the API log.'

export function hashSetupToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * First-run setup: while no admin has been created through the wizard, a one-time token is
 * printed in the API log; `completeSetup` exchanges it for the first admin and closes setup for
 * good. Only the token's SHA-256 hash is stored.
 */
@Injectable()
export class SetupService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Setup')

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    @Inject(AUTH_INSTANCE) private readonly auth: SetupAuth,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const state = await this.prisma.client.setupState.upsert({
      where: { id: STATE_ID },
      create: { id: STATE_ID },
      update: {},
    })
    if (state.setupComplete) return
    const token = await this.issueToken()
    this.logger.log(
      'This instance is awaiting setup.\n' +
        `  Setup page:  ${this.env.webOrigins[0]}/setup\n` +
        `  Setup token: ${token}\n` +
        '  A new token is issued on every restart until setup completes.\n' +
        '  Reissue without restarting: npm run setup:token -w apps/api   (prod: npm run setup:token:prod)',
    )
  }

  async status(): Promise<{ setupComplete: boolean; minPasswordLength: number }> {
    const state = await this.prisma.client.setupState.findUnique({ where: { id: STATE_ID } })
    return { setupComplete: state?.setupComplete ?? false, minPasswordLength: MIN_PASSWORD_LENGTH }
  }

  /** Mints a new token, stores its hash and returns it. Any earlier token stops working. */
  async issueToken(): Promise<string> {
    const token = randomBytes(24).toString('base64url')
    const { count } = await this.prisma.client.setupState.updateMany({
      where: { id: STATE_ID, setupComplete: false },
      data: { setupTokenHash: hashSetupToken(token) },
    })
    if (count === 0) throw new ConflictException('This instance has already been set up')
    return token
  }

  /** Creates the first admin. Resumable: a retry with the same email finishes a partial run. */
  async completeSetup(args: CompleteSetupArgs): Promise<{ email: string }> {
    const email = args.email.trim().toLowerCase()
    const state = await this.prisma.client.setupState.findUnique({ where: { id: STATE_ID } })
    if (state?.setupComplete) throw new ConflictException('This instance has already been set up')
    if (!state?.setupTokenHash || !this.tokenMatches(args.token.trim(), state.setupTokenHash)) {
      throw new BadRequestException(INVALID_TOKEN)
    }
    if (args.password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    }

    let user = await this.prisma.client.user.findUnique({ where: { email } })
    if (user) {
      this.logger.warn(`Resuming setup for ${email}; the existing account keeps its password.`)
    } else {
      if ((await this.prisma.client.user.count()) > 0) {
        throw new ConflictException('Users already exist on this instance; setup cannot be re-run')
      }
      try {
        // No headers: Better Auth treats this as a trusted server call.
        await this.auth.api.createUser({
          body: { email, password: args.password, name: args.name.trim(), role: 'admin' },
        })
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'Could not create the admin',
        )
      }
      user = await this.prisma.client.user.findUnique({ where: { email } })
      if (!user) throw new BadRequestException('The admin account was not created')
    }

    const userId = user.id
    await this.prisma.client.$transaction(async (tx) => {
      const { count } = await tx.setupState.updateMany({
        where: { id: STATE_ID, setupComplete: false },
        data: { setupComplete: true, setupTokenHash: null },
      })
      if (count === 0) throw new ConflictException('This instance has already been set up')
      await tx.user.update({ where: { id: userId }, data: { emailVerified: true } })
      await this.access.assignRole(userId, ADMIN_ROLE_ID, tx)
    })
    this.logger.log(`Setup complete. First admin: ${email}`)
    return { email }
  }

  private tokenMatches(token: string, storedHash: string): boolean {
    const a = Buffer.from(hashSetupToken(token), 'hex')
    const b = Buffer.from(storedHash, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  }
}
