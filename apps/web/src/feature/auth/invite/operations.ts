import { graphql } from '@/graphql/codegen'

export const VALIDATE_INVITE = graphql(`
  query ValidateInvite($token: String!) {
    validateInviteToken(token: $token) {
      valid
      email
      role
    }
  }
`)

export const ACCEPT_INVITE = graphql(`
  mutation AcceptInvite($token: String!) {
    acceptInvite(token: $token) {
      role
    }
  }
`)
