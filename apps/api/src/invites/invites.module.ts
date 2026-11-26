import { Module } from '@nestjs/common'
import { InvitesResolver } from './invites.resolver.js'
import { InvitesService } from './invites.service.js'

@Module({
  providers: [InvitesResolver, InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
