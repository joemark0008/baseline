import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { prisma } from './prisma.client.js'

/** Owns the Prisma client lifecycle; services inject it (NestJS Prisma recipe). */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client = prisma

  async onModuleInit(): Promise<void> {
    await this.client.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect()
  }
}

/** The client handed to `$transaction(async (tx) => …)`; pass it to helpers that join a transaction. */
export type PrismaTx = Omit<
  PrismaService['client'],
  '$connect' | '$disconnect' | '$on' | '$use' | '$extends' | '$transaction'
>
