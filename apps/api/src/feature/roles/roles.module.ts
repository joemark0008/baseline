import { Module } from '@nestjs/common'
import { UsersModule } from '../users/users.module.js'
import { RolesService } from './roles.service.js'
import { RolesResolver } from './roles.resolver.js'

@Module({
  imports: [UsersModule],
  providers: [RolesService, RolesResolver],
})
export class RolesModule {}
