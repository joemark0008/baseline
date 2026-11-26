import { graphql } from '@/graphql/codegen'

export const USER_FIELDS = graphql(`
  fragment UserFields on User {
    id
    name
    email
    username
    accessRole {
      id
      name
      kind
    }
    deactivated
    createdAt
    can {
      edit
      changeRole
      deactivate
      reactivate
      resetPassword
    }
    passwordResetExpiresAt
  }
`)

export const FIND_ALL_USERS = graphql(`
  query FindAllUsers($page: Int, $perPage: Int) {
    findAllUsers(page: $page, perPage: $perPage) {
      data {
        ...UserFields
      }
      meta {
        total
        currentPage
        lastPage
        perPage
        hasNextPage
        hasPrevPage
      }
    }
  }
`)

/** Roles the caller may move people into, filtered by the server. */
export const ASSIGNABLE_ROLES = graphql(`
  query AssignableRoles {
    assignableRoles {
      id
      name
    }
  }
`)

export const INVITE_ROLES = graphql(`
  query InviteRoles {
    inviteRoles {
      id
      name
      kind
    }
  }
`)

export const INVITE_USER = graphql(`
  mutation InviteUser($input: InviteUserInput!) {
    inviteUser(input: $input) {
      invite {
        id
        email
        accessRole {
          name
        }
        expiresAt
      }
      inviteUrl
      emailSent
    }
  }
`)

export const PENDING_INVITES = graphql(`
  query PendingInvites($page: Int, $perPage: Int) {
    pendingInvites(page: $page, perPage: $perPage) {
      data {
        id
        email
        accessRole {
          name
        }
        expiresAt
      }
      meta {
        total
      }
    }
  }
`)

export const REVOKE_INVITE = graphql(`
  mutation RevokeInvite($id: ID!) {
    revokeInvite(id: $id)
  }
`)

export const SET_USER_ROLE = graphql(`
  mutation SetUserRole($input: SetUserRoleInput!) {
    setUserRole(input: $input) {
      ...UserFields
    }
  }
`)

export const UPDATE_USER = graphql(`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      ...UserFields
    }
  }
`)

export const DEACTIVATE_USER = graphql(`
  mutation DeactivateUser($id: ID!) {
    deactivateUser(id: $id) {
      ...UserFields
    }
  }
`)

export const REACTIVATE_USER = graphql(`
  mutation ReactivateUser($id: ID!) {
    reactivateUser(id: $id) {
      ...UserFields
    }
  }
`)

/** The URL comes back once; the server keeps only its fingerprint. */
export const CREATE_PASSWORD_RESET_LINK = graphql(`
  mutation CreatePasswordResetLink($userId: ID!) {
    createPasswordResetLink(userId: $userId) {
      url
      expiresAt
      emailSent
    }
  }
`)

export const CANCEL_PASSWORD_RESET_LINK = graphql(`
  mutation CancelPasswordResetLink($userId: ID!) {
    cancelPasswordResetLink(userId: $userId)
  }
`)
