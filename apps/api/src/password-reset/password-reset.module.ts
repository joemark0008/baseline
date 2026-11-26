import { Module } from '@nestjs/common'
import { PasswordResetResolver } from './password-reset.resolver.js'
import { PasswordResetService } from './password-reset.service.js'
import { PasswordService } from './password.service.js'

@Module({
  providers: [PasswordResetService, PasswordService, PasswordResetResolver],
  exports: [PasswordResetService],
})
export class PasswordResetModule {}
