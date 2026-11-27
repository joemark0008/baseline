import { graphql } from '@/graphql/codegen'

export const PROJECT_LIST = graphql(`
  query ProjectList($page: Int, $perPage: Int, $sort: ProjectsSort) {
    projects(page: $page, perPage: $perPage, sort: $sort) {
      data {
        id
        name
        hospitalName
        status
        startDate
        targetGoLiveDate
        myRole
        myOpenTasks
        updatedAt
        summary {
          totalTasks
          openTasks
          overdueTasks
          phaseCount
          completePhases
          progress
        }
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

export const PROJECT = graphql(`
  query Project($id: ID!) {
    project(id: $id) {
      id
      name
      hospitalName
      description
      status
      startDate
      targetGoLiveDate
      createdAt
      updatedAt
      myRole
      can {
        manage
        edit
      }
      summary {
        totalTasks
        openTasks
        overdueTasks
        phaseCount
        completePhases
        progress
      }
      phases {
        id
        name
        description
        order
        owner {
          id
          name
          email
          image
        }
        startDate
        endDate
        status
        tasks {
          id
          projectId
          phaseId
          title
          description
          owner {
            id
            name
            email
            image
          }
          status
          priority
          startDate
          dueDate
          overdue
          predecessor {
            id
            title
          }
          position
          predecessorConflict
          completedAt
          createdAt
          updatedAt
        }
        deliverables {
          id
          phaseId
          title
          kind
          owner {
            id
            name
            email
            image
          }
          reviewer {
            id
            name
            email
            image
          }
          dueDate
          status
          reviewOutcome
          reviewNote
          reviewedAt
          links {
            label
            url
          }
          order
        }
      }
      members {
        user {
          id
          name
          email
          image
        }
        role
        addedAt
      }
      stakeholders {
        id
        name
        organization
        role
        email
        phone
        notes
        user {
          id
          name
          email
          image
        }
      }
      pendingInvites {
        id
        email
        role
        expiresAt
      }
    }
  }
`)

export const PROJECT_TASK = graphql(`
  query ProjectTask($id: ID!) {
    projectTask(id: $id) {
      id
      projectId
      phaseId
      title
      description
      owner {
        id
        name
        email
        image
      }
      status
      priority
      startDate
      dueDate
      overdue
      predecessor {
        id
        title
      }
      position
      predecessorConflict
      completedAt
      createdAt
      updatedAt
      comments {
        id
        body
        createdAt
        author {
          id
          name
          email
          image
        }
        mentions {
          id
          name
          email
          image
        }
      }
    }
  }
`)

export const PROJECT_ACTIVITY = graphql(`
  query ProjectActivity($projectId: ID!, $page: Int, $perPage: Int, $targetId: ID) {
    projectActivity(projectId: $projectId, page: $page, perPage: $perPage, targetId: $targetId) {
      data {
        id
        kind
        summary
        targetType
        targetId
        createdAt
        actor {
          id
          name
          email
          image
        }
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

export const PROJECT_MEMBER_CANDIDATES = graphql(`
  query ProjectMemberCandidates($projectId: ID!, $search: String) {
    projectMemberCandidates(projectId: $projectId, search: $search) {
      id
      name
      email
      image
    }
  }
`)

export const IMPLEMENTATION_TEMPLATE = graphql(`
  query ImplementationTemplate {
    implementationTemplate {
      id
      name
      description
      order
      deliverables {
        id
        title
        kind
        order
      }
    }
  }
`)

export const CREATE_PROJECT = graphql(`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
    }
  }
`)

export const UPDATE_PROJECT = graphql(`
  mutation UpdateProject($input: UpdateProjectInput!) {
    updateProject(input: $input) {
      id
      name
      hospitalName
      description
      status
      startDate
      targetGoLiveDate
    }
  }
`)

export const ADD_PROJECT_PHASE = graphql(`
  mutation AddProjectPhase($input: AddPhaseInput!) {
    addProjectPhase(input: $input) {
      id
      name
      order
    }
  }
`)

export const UPDATE_PROJECT_PHASE = graphql(`
  mutation UpdateProjectPhase($input: UpdatePhaseInput!) {
    updateProjectPhase(input: $input) {
      id
      name
      description
      order
      startDate
      endDate
      status
      owner {
        id
        name
        email
        image
      }
    }
  }
`)

export const REORDER_PROJECT_PHASES = graphql(`
  mutation ReorderProjectPhases($projectId: ID!, $phaseIds: [ID!]!) {
    reorderProjectPhases(projectId: $projectId, phaseIds: $phaseIds) {
      id
      order
    }
  }
`)

export const REMOVE_PROJECT_PHASE = graphql(`
  mutation RemoveProjectPhase($id: ID!) {
    removeProjectPhase(id: $id)
  }
`)

export const CREATE_PROJECT_TASK = graphql(`
  mutation CreateProjectTask($input: CreateTaskInput!) {
    createProjectTask(input: $input) {
      id
      title
    }
  }
`)

export const UPDATE_PROJECT_TASK = graphql(`
  mutation UpdateProjectTask($input: UpdateTaskInput!) {
    updateProjectTask(input: $input) {
      id
      title
      status
      priority
      startDate
      dueDate
      overdue
      phaseId
      owner {
        id
        name
        email
        image
      }
      predecessor {
        id
        title
      }
    }
  }
`)

export const DELETE_PROJECT_TASK = graphql(`
  mutation DeleteProjectTask($id: ID!) {
    deleteProjectTask(id: $id)
  }
`)

export const MOVE_PROJECT_TASK = graphql(`
  mutation MoveProjectTask($input: MoveTaskInput!) {
    moveProjectTask(input: $input) {
      id
      phaseId
      status
      position
    }
  }
`)

export const ADD_TASK_COMMENT = graphql(`
  mutation AddTaskComment($input: AddTaskCommentInput!) {
    addTaskComment(input: $input) {
      id
      body
      createdAt
      author {
        id
        name
        email
        image
      }
      mentions {
        id
        name
        email
        image
      }
    }
  }
`)

export const ADD_PROJECT_MEMBER = graphql(`
  mutation AddProjectMember($projectId: ID!, $userId: ID!, $role: ProjectRole!) {
    addProjectMember(projectId: $projectId, userId: $userId, role: $role) {
      id
    }
  }
`)

export const INVITE_PROJECT_MEMBER = graphql(`
  mutation InviteProjectMember($input: InviteProjectMemberInput!) {
    inviteProjectMember(input: $input) {
      joinedUserId
      emailSent
      invite {
        id
        email
        role
        expiresAt
      }
    }
  }
`)

export const SET_PROJECT_MEMBER_ROLE = graphql(`
  mutation SetProjectMemberRole($projectId: ID!, $userId: ID!, $role: ProjectRole!) {
    setProjectMemberRole(projectId: $projectId, userId: $userId, role: $role) {
      id
    }
  }
`)

export const REMOVE_PROJECT_MEMBER = graphql(`
  mutation RemoveProjectMember($projectId: ID!, $userId: ID!) {
    removeProjectMember(projectId: $projectId, userId: $userId) {
      id
    }
  }
`)

export const ADD_PROJECT_DELIVERABLE = graphql(`
  mutation AddProjectDeliverable($input: AddDeliverableInput!) {
    addProjectDeliverable(input: $input) {
      id
      title
    }
  }
`)

export const UPDATE_PROJECT_DELIVERABLE = graphql(`
  mutation UpdateProjectDeliverable($input: UpdateDeliverableInput!) {
    updateProjectDeliverable(input: $input) {
      id
      title
      status
      dueDate
      links {
        label
        url
      }
    }
  }
`)

export const REVIEW_PROJECT_DELIVERABLE = graphql(`
  mutation ReviewProjectDeliverable($input: ReviewDeliverableInput!) {
    reviewProjectDeliverable(input: $input) {
      id
      status
      reviewOutcome
      reviewNote
      reviewedAt
    }
  }
`)

export const MOVE_PROJECT_DELIVERABLE = graphql(`
  mutation MoveProjectDeliverable($input: MoveDeliverableInput!) {
    moveProjectDeliverable(input: $input) {
      id
      phaseId
      order
    }
  }
`)

export const REMOVE_PROJECT_DELIVERABLE = graphql(`
  mutation RemoveProjectDeliverable($id: ID!) {
    removeProjectDeliverable(id: $id)
  }
`)

export const ADD_PROJECT_STAKEHOLDER = graphql(`
  mutation AddProjectStakeholder($input: AddStakeholderInput!) {
    addProjectStakeholder(input: $input) {
      id
      name
    }
  }
`)

export const UPDATE_PROJECT_STAKEHOLDER = graphql(`
  mutation UpdateProjectStakeholder($input: UpdateStakeholderInput!) {
    updateProjectStakeholder(input: $input) {
      id
      name
      organization
      role
      email
      phone
      notes
    }
  }
`)

export const REMOVE_PROJECT_STAKEHOLDER = graphql(`
  mutation RemoveProjectStakeholder($id: ID!) {
    removeProjectStakeholder(id: $id)
  }
`)

export const ADD_TEMPLATE_PHASE = graphql(`
  mutation AddTemplatePhase($input: AddTemplatePhaseInput!) {
    addTemplatePhase(input: $input) {
      id
      name
      order
    }
  }
`)

export const UPDATE_TEMPLATE_PHASE = graphql(`
  mutation UpdateTemplatePhase($input: UpdateTemplatePhaseInput!) {
    updateTemplatePhase(input: $input) {
      id
      name
      description
    }
  }
`)

export const REORDER_TEMPLATE_PHASES = graphql(`
  mutation ReorderTemplatePhases($ids: [ID!]!) {
    reorderTemplatePhases(ids: $ids) {
      id
      order
    }
  }
`)

export const REMOVE_TEMPLATE_PHASE = graphql(`
  mutation RemoveTemplatePhase($id: ID!) {
    removeTemplatePhase(id: $id)
  }
`)

export const ADD_TEMPLATE_DELIVERABLE = graphql(`
  mutation AddTemplateDeliverable($input: AddTemplateDeliverableInput!) {
    addTemplateDeliverable(input: $input) {
      id
      title
      kind
      order
    }
  }
`)

export const REMOVE_TEMPLATE_DELIVERABLE = graphql(`
  mutation RemoveTemplateDeliverable($id: ID!) {
    removeTemplateDeliverable(id: $id)
  }
`)
