import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { formatGraphqlError } from './format-error.js'
import { SCHEMA_FILE } from './schema-file.js'

const isProd = process.env.NODE_ENV === 'production'

/** Code-first GraphQL. The schema is regenerated into the committed file on every boot. */
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // In production the image is read-only for the app user: build the schema in memory only.
      autoSchemaFile: isProd ? true : SCHEMA_FILE,
      sortSchema: true,
      playground: false,
      introspection: !isProd,
      includeStacktraceInErrorResponses: false,
      plugins: isProd ? [] : [ApolloServerPluginLandingPageLocalDefault()],
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      formatError: formatGraphqlError,
    }),
  ],
})
export class ApiGraphQLModule {}
