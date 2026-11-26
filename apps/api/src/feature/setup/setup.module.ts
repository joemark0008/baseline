import { Module } from '@nestjs/common'
import { auth } from '../../auth/auth.config.js'
import { AUTH_INSTANCE, SetupService } from './setup.service.js'
import { SetupResolver } from './setup.resolver.js'

@Module({
  providers: [SetupService, { provide: AUTH_INSTANCE, useValue: auth }, SetupResolver],
  exports: [SetupService],
})
export class SetupModule {}
