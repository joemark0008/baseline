import { Global, Module } from '@nestjs/common'
import { AccessResolver } from './access.resolver.js'
import { AccessService } from './access.service.js'

/** Global so every feature's `@RequirePermission` guard can read permissions. */
@Global()
@Module({
  providers: [AccessService, AccessResolver],
  exports: [AccessService],
})
export class AccessModule {}
