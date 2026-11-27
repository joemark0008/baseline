import { Field, ID, InputType } from '@nestjs/graphql'
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator'
import { TaskPriority, TaskStatus } from '../entities/enums.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

@InputType()
export class CreateTaskInput {
  @Field(() => ID) @IsString() projectId: string
  @Field(() => ID) @IsString() phaseId: string
  @Field() @IsString() @Length(1, 160) title: string
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(4000) description?:
    string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() ownerId?: string | null
  @Field(() => TaskStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus | null
  @Field(() => TaskPriority, { nullable: true })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) startDate?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) dueDate?: string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() predecessorId?: string | null
}

@InputType()
export class UpdateTaskInput {
  @Field(() => ID) @IsString() id: string
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() phaseId?: string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @Length(1, 160) title?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(4000) description?:
    string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() ownerId?: string | null
  @Field(() => TaskStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus | null
  @Field(() => TaskPriority, { nullable: true })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) startDate?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) dueDate?: string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() predecessorId?: string | null
}

@InputType()
export class AddTaskCommentInput {
  @Field(() => ID) @IsString() taskId: string
  @Field() @IsString() @Length(1, 4000) body: string
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  mentionUserIds?: string[] | null
}
