import { graphql } from '@/graphql/codegen'

export const MY_ACCESS = graphql(`
  query MyAccess {
    myAccess {
      role {
        id
        name
        kind
      }
      permissions
    }
  }
`)
