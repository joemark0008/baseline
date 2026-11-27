import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql'
import { Paginated } from '../../../common/pagination/paginated.output.js'
import {
  DeliverableKind,
  DeliverableStatus,
  PhaseStatus,
  ProjectRole,
  ProjectStatus,
  ReviewOutcome,
  TaskPriority,
  TaskStatus,
} from './enums.js'
import { PersonSummary } from './person-summary.entity.js'

@ObjectType()
export class ProjectCapabilities {
  @Field({
    description: 'The caller is a Manager: tailor the plan, manage people and the project record.',
  })
  manage: boolean
  @Field({ description: 'The caller is a member: tasks, deliverables and comments.' }) edit: boolean
}

@ObjectType()
export class ProjectSummary {
  @Field(() => Int) totalTasks: number
  @Field(() => Int) openTasks: number
  @Field(() => Int) overdueTasks: number
  @Field(() => Int) phaseCount: number
  @Field(() => Int) completePhases: number
  @Field(() => Int, { description: 'Complete phases as a percentage of all phases.' })
  progress: number
}

@ObjectType()
export class ProjectMember {
  @Field(() => PersonSummary) user: PersonSummary
  @Field(() => ProjectRole) role: ProjectRole
  @Field() addedAt: Date
}

@ObjectType()
export class ProjectInvite {
  @Field(() => ID) id: string
  @Field() email: string
  @Field(() => ProjectRole) role: ProjectRole
  @Field() expiresAt: Date
}

@ObjectType()
export class TaskRef {
  @Field(() => ID) id: string
  @Field() title: string
}

@ObjectType()
export class TaskComment {
  @Field(() => ID) id: string
  @Field(() => PersonSummary) author: PersonSummary
  @Field() body: string
  @Field(() => [PersonSummary]) mentions: PersonSummary[]
  @Field() createdAt: Date
}

@ObjectType()
export class ProjectTask {
  @Field(() => ID) id: string
  @Field(() => ID) projectId: string
  @Field(() => ID) phaseId: string
  @Field() title: string
  @Field(() => String, { nullable: true }) description: string | null
  @Field(() => PersonSummary, { nullable: true }) owner: PersonSummary | null
  @Field(() => TaskStatus) status: TaskStatus
  @Field(() => TaskPriority) priority: TaskPriority
  @Field(() => String, { nullable: true, description: 'YYYY-MM-DD' }) startDate: string | null
  @Field(() => String, { nullable: true, description: 'YYYY-MM-DD' }) dueDate: string | null
  @Field({ description: 'Due before today and not complete (FR-008).' }) overdue: boolean
  @Field(() => TaskRef, { nullable: true }) predecessor: TaskRef | null
  @Field(() => Float, {
    description: 'Manual order within the project; lower comes first (feature 010).',
  })
  position: number
  @Field({
    description:
      'Starts before its predecessor is due; a warning, not a refusal (feature 010, FR-019).',
  })
  predecessorConflict: boolean
  @Field(() => Date, {
    nullable: true,
    description: 'When the status last became COMPLETE; null while not complete (feature 011).',
  })
  completedAt: Date | null
  @Field() createdAt: Date
  @Field() updatedAt: Date
  @Field(() => [TaskComment]) comments: TaskComment[]
}

@ObjectType()
export class DeliverableLink {
  @Field() label: string
  @Field() url: string
}

@ObjectType()
export class ProjectDeliverable {
  @Field(() => ID) id: string
  @Field(() => ID) phaseId: string
  @Field() title: string
  @Field(() => DeliverableKind) kind: DeliverableKind
  @Field(() => PersonSummary, { nullable: true }) owner: PersonSummary | null
  @Field(() => PersonSummary, { nullable: true }) reviewer: PersonSummary | null
  @Field(() => String, { nullable: true, description: 'YYYY-MM-DD' }) dueDate: string | null
  @Field(() => DeliverableStatus) status: DeliverableStatus
  @Field(() => ReviewOutcome, { nullable: true }) reviewOutcome: ReviewOutcome | null
  @Field(() => String, { nullable: true }) reviewNote: string | null
  @Field(() => Date, { nullable: true }) reviewedAt: Date | null
  @Field(() => [DeliverableLink]) links: DeliverableLink[]
  @Field(() => Int) order: number
}

@ObjectType()
export class ProjectPhase {
  @Field(() => ID) id: string
  @Field() name: string
  @Field(() => String, { nullable: true }) description: string | null
  @Field(() => Int) order: number
  @Field(() => PersonSummary, { nullable: true }) owner: PersonSummary | null
  @Field(() => String, { nullable: true, description: 'YYYY-MM-DD' }) startDate: string | null
  @Field(() => String, { nullable: true, description: 'YYYY-MM-DD' }) endDate: string | null
  @Field(() => PhaseStatus) status: PhaseStatus
  @Field(() => [ProjectTask]) tasks: ProjectTask[]
  @Field(() => [ProjectDeliverable]) deliverables: ProjectDeliverable[]
}

@ObjectType()
export class ProjectStakeholder {
  @Field(() => ID) id: string
  @Field() name: string
  @Field() organization: string
  @Field() role: string
  @Field(() => String, { nullable: true }) email: string | null
  @Field(() => String, { nullable: true }) phone: string | null
  @Field(() => PersonSummary, {
    nullable: true,
    description: 'Linked account, if any; not a membership.',
  })
  user: PersonSummary | null
  @Field(() => String, { nullable: true }) notes: string | null
}

@ObjectType()
export class Project {
  @Field(() => ID) id: string
  @Field() name: string
  @Field() hospitalName: string
  @Field(() => String, { nullable: true }) description: string | null
  @Field(() => ProjectStatus) status: ProjectStatus
  @Field(() => String, { nullable: true, description: 'YYYY-MM-DD' }) startDate: string | null
  @Field(() => String, { nullable: true, description: 'YYYY-MM-DD' }) targetGoLiveDate:
    string | null
  @Field() createdAt: Date
  @Field() updatedAt: Date
  @Field(() => ProjectRole) myRole: ProjectRole
  @Field(() => ProjectCapabilities) can: ProjectCapabilities
  @Field(() => ProjectSummary) summary: ProjectSummary
  @Field(() => [ProjectPhase]) phases: ProjectPhase[]
  @Field(() => [ProjectMember]) members: ProjectMember[]
  @Field(() => [ProjectStakeholder]) stakeholders: ProjectStakeholder[]
  @Field(() => [ProjectInvite], {
    description: 'Pending email invites; Managers only, otherwise empty.',
  })
  pendingInvites: ProjectInvite[]
}

@ObjectType()
export class ProjectListItem {
  @Field(() => ID) id: string
  @Field() name: string
  @Field() hospitalName: string
  @Field(() => ProjectStatus) status: ProjectStatus
  @Field(() => String, { nullable: true }) startDate: string | null
  @Field(() => String, { nullable: true }) targetGoLiveDate: string | null
  @Field(() => ProjectRole) myRole: ProjectRole
  @Field(() => ProjectSummary) summary: ProjectSummary
  @Field(() => Int, { description: "The caller's own tasks that are not complete." })
  myOpenTasks: number
  @Field() updatedAt: Date
}

@ObjectType()
export class ProjectsPage extends Paginated(ProjectListItem) {}
