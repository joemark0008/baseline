import { ArgsType, Field, ID, InputType } from '@nestjs/graphql'
import { PageArgs } from '../../../common/pagination/page-args.js'
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator'
import {
  ProjectRole,
  ProjectStatus,
  ProjectsSort,
  TaskSort,
  TaskStatus,
} from '../entities/enums.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

@InputType()
export class CreateProjectInput {
  @Field() @IsString() @Length(2, 120) name: string
  @Field() @IsString() @Length(2, 120) hospitalName: string
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(2000) description?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) startDate?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) targetGoLiveDate?:
    string | null
}

@InputType()
export class UpdateProjectInput {
  @Field(() => ID) @IsString() id: string
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @Length(2, 120) name?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @Length(2, 120) hospitalName?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(2000) description?:
    string | null
  @Field(() => ProjectStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) startDate?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) targetGoLiveDate?:
    string | null
  /** Set true to clear a date that is sent as null. */
  @Field(() => Boolean, { nullable: true }) @IsOptional() @IsBoolean() clearDates?: boolean | null
}

@InputType()
export class InviteProjectMemberInput {
  @Field(() => ID) @IsString() projectId: string
  @Field() @IsEmail() email: string
  @Field(() => ProjectRole) @IsEnum(ProjectRole) role: ProjectRole
}

@ArgsType()
export class TaskFilterArgs {
  @Field(() => ID) @IsString() projectId: string
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() phaseId?: string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() ownerId?: string | null
  @Field(() => TaskStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus | null
  @Field(() => Boolean, { nullable: true }) @IsOptional() @IsBoolean() overdue?: boolean | null
  @Field(() => TaskSort, { nullable: true, description: 'Default POSITION (manual order).' })
  @IsOptional()
  @IsEnum(TaskSort)
  sort?: TaskSort | null
}

/** `projects(...)`: paging plus a sort order (feature 010). */
@ArgsType()
export class ProjectsListArgs extends PageArgs {
  @Field(() => ProjectsSort, { nullable: true, description: 'Default RECENT.' })
  @IsOptional()
  @IsEnum(ProjectsSort)
  sort?: ProjectsSort | null
}

/** `projectActivity(...)`: paging plus an optional target filter (feature 010). */
@ArgsType()
export class ProjectActivityArgs extends PageArgs {
  @Field(() => ID) @IsString() projectId: string
  @Field(() => ID, { nullable: true, description: 'Only entries about this task/phase/etc.' })
  @IsOptional()
  @IsString()
  targetId?: string | null
}
