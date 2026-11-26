import { graphql } from '@/graphql/codegen'

export const PASSWORD_POLICY = graphql(`
  query PasswordPolicy {
    passwordPolicy {
      minLength
      maxLength
    }
  }
`)

export const VALIDATE_PASSWORD_RESET_TOKEN = graphql(`
  query ValidatePasswordResetToken($token: String!) {
    validatePasswordResetToken(token: $token) {
      valid
      name
      expiresAt
    }
  }
`)

export const RESET_PASSWORD = graphql(`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`)
