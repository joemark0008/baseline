import { Module } from '@nestjs/common'
import { PasswordResetModule } from '../password-reset/password-reset.module.js'
import { UsersResolver } from './users.resolver.js'
import { UsersService } from './users.service.js'

@Module({
  imports: [PasswordResetModule],
  providers: [UsersResolver, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
