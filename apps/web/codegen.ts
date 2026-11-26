import type { CodegenConfig } from '@graphql-codegen/cli'

/**
 * Reads the API's committed schema so codegen works offline and in CI.
 * Point at a live server with GRAPHQL_SCHEMA=http://localhost:3001/graphql.
 * `ignoreNoDocuments` must stay false: a malformed document must fail loudly.
 */
const config: CodegenConfig = {
  schema: process.env.GRAPHQL_SCHEMA ?? '../api/schema.graphql',
  documents: ['src/**/*.{ts,tsx}', '!src/graphql/codegen/**'],
  ignoreNoDocuments: false,
  generates: {
    './src/graphql/codegen/': {
      preset: 'client',
      presetConfig: { gqlTagName: 'graphql', fragmentMasking: false },
      config: { useTypeImports: true, scalars: { DateTime: 'string' } },
    },
  },
}

export default config
