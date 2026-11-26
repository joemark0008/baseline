import { graphql } from '@/graphql/codegen'

export const ROLE_FIELDS = graphql(`
  fragment RoleFields on Role {
    id
    name
    description
    kind
    grants {
      area
      action
    }
    memberCount
    pendingInviteCount
    can {
      edit
      rename
      editGrants
      delete
    }
  }
`)

export const ROLES = graphql(`
  query Roles {
    roles {
      ...RoleFields
    }
  }
`)

export const ROLE_EDITOR = graphql(`
  query RoleEditor($id: ID!) {
    role(id: $id) {
      ...RoleFields
    }
    permissionAreas {
      key
      name
      actions {
        action
        description
        requires
      }
    }
  }
`)

export const PERMISSION_AREAS = graphql(`
  query PermissionAreas {
    permissionAreas {
      key
      name
      actions {
        action
        description
        requires
      }
    }
  }
`)

export const CREATE_ROLE = graphql(`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      ...RoleFields
    }
  }
`)

export const UPDATE_ROLE = graphql(`
  mutation UpdateRole($input: UpdateRoleInput!) {
    updateRole(input: $input) {
      ...RoleFields
    }
  }
`)

export const DELETE_ROLE = graphql(`
  mutation DeleteRole($id: ID!) {
    deleteRole(id: $id)
  }
`)

export const ACCESS_CHANGES = graphql(`
  query AccessChanges($page: Int, $perPage: Int) {
    accessChanges(page: $page, perPage: $perPage) {
      data {
        id
        kind
        actorName
        summary
        createdAt
      }
      meta {
        total
        currentPage
        lastPage
        hasNextPage
      }
    }
  }
`)
