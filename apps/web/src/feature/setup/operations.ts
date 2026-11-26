import { graphql } from '@/graphql/codegen'

export const SETUP_STATUS = graphql(`
  query SetupStatus {
    setupStatus {
      setupComplete
      minPasswordLength
    }
  }
`)

export const COMPLETE_SETUP = graphql(`
  mutation CompleteSetup($input: CompleteSetupInput!) {
    completeSetup(input: $input) {
      email
    }
  }
`)
