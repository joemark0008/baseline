import 'reflect-metadata'
import { writeFileSync } from 'node:fs'
import { NestFactory } from '@nestjs/core'
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql'
import { lexicographicSortSchema, printSchema } from 'graphql'
import { API_RESOLVERS } from './graphql/resolvers.js'
import { SCHEMA_FILE } from './graphql/schema-file.js'

/** Same header Nest writes for `autoSchemaFile`, so boot and this script produce identical files. */
const HEADER =
  '# ------------------------------------------------------\n' +
  '# THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)\n' +
  '# ------------------------------------------------------\n\n'

/** Builds schema.graphql from the decorated classes without booting the app or touching the DB. */
async function generate(): Promise<void> {
  const app = await NestFactory.create(GraphQLSchemaBuilderModule, { logger: false })
  await app.init()
  const schema = await app.get(GraphQLSchemaFactory).create(API_RESOLVERS)
  writeFileSync(SCHEMA_FILE, `${HEADER}${printSchema(lexicographicSortSchema(schema))}`)
  await app.close()
  console.log(`wrote ${SCHEMA_FILE}`)
}

void generate()
