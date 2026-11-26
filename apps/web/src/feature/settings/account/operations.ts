import { graphql } from '@/graphql/codegen'

export const MY_ACCOUNT = graphql(`
  query MyAccount {
    me {
      id
      name
      email
      can {
        changePassword
      }
    }
    passwordPolicy {
      minLength
      maxLength
    }
  }
`)

export const CHANGE_PASSWORD = graphql(`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`)
