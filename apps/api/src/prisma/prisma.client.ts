import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

/**
 * Single Prisma client for the process. Shared by the Nest `PrismaService` and the Better Auth
 * adapter (which must exist before the Nest container is built).
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export const prisma = createPrismaClient(process.env.DATABASE_URL ?? '')
