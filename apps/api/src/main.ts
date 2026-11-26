import './config/load-dotenv.js'
import 'reflect-metadata'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module.js'
import { corsOptions } from './config/cors.js'
import { APP_ENV, type AppEnv } from './config/env.js'

async function bootstrap(): Promise<void> {
  // bodyParser: false is required by @thallesp/nestjs-better-auth (it re-adds parsers for other routes).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })
  const env = app.get<AppEnv>(APP_ENV)
  app.set('trust proxy', 1)
  app.enableCors(corsOptions(env))
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.enableShutdownHooks()
  await app.listen(env.port)
  Logger.log(`API listening on :${env.port} (${env.nodeEnv})`, 'Bootstrap')
}

void bootstrap()
