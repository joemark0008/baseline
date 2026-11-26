import { Global, Module } from '@nestjs/common'
import { auth } from './auth.config.js'
import { AUTH_CONTEXT, AuthPasswords } from './auth-passwords.js'

/** Makes `AuthPasswords` available to every feature (users, password-reset). */
@Global()
@Module({
  providers: [{ provide: AUTH_CONTEXT, useFactory: () => auth.$context }, AuthPasswords],
  exports: [AuthPasswords],
})
export class AuthPasswordsModule {}
