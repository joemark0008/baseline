import './config/load-dotenv.js'
import { randomBytes } from 'node:crypto'
import { prisma } from './prisma/prisma.client.js'
import { hashSetupToken } from './feature/setup/setup.service.js'

/**
 * Reissue the first-run setup token without restarting the API.
 * Only the hash is stored, so a lost token cannot be recovered, only replaced.
 */
async function main(): Promise<void> {
  const state = await prisma.setupState.findUnique({ where: { id: 1 } })
  if (!state) {
    console.error('No setup state yet. Start the API once first.')
    process.exitCode = 1
    return
  }
  if (state.setupComplete) {
    console.error('This instance is already set up; invite people from Admin → Users.')
    process.exitCode = 1
    return
  }
  const token = randomBytes(24).toString('base64url')
  await prisma.setupState.update({
    where: { id: 1 },
    data: { setupTokenHash: hashSetupToken(token) },
  })
  const webOrigin = (process.env.WEB_ORIGINS ?? 'http://localhost:4173').split(',')[0].trim()
  console.log(`\nSetup page:  ${webOrigin}/setup`)
  console.log(`Setup token: ${token}`)
  console.log('Any token issued earlier no longer works.\n')
}

main()
  .catch((e: unknown) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
