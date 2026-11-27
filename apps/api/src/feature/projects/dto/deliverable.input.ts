import { Field, ID, InputType } from '@nestjs/graphql'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { DeliverableKind, DeliverableStatus, ReviewOutcome } from '../entities/enums.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

@InputType()
export class DeliverableLinkInput {
  @Field() @IsString() @Length(1, 120) label: string
  @Field() @IsUrl({ require_protocol: true }) @MaxLength(2000) url: string
}

@InputType()
export class AddDeliverableInput {
  @Field(() => ID) @IsString() projectId: string
  @Field(() => ID) @IsString() phaseId: string
  @Field() @IsString() @Length(1, 160) title: string
  @Field(() => DeliverableKind, { nullable: true })
  @IsOptional()
  @IsEnum(DeliverableKind)
  kind?: DeliverableKind | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() ownerId?: string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() reviewerId?: string | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) dueDate?: string | null
}

@InputType()
export class UpdateDeliverableInput {
  @Field(() => ID) @IsString() id: string
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @Length(1, 160) title?:
    string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() ownerId?: string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() reviewerId?: string | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) dueDate?: string | null
  @Field(() => DeliverableStatus, { nullable: true })
  @IsOptional()
  @IsEnum(DeliverableStatus)
  status?: DeliverableStatus | null
  @Field(() => [DeliverableLinkInput], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => DeliverableLinkInput)
  links?: DeliverableLinkInput[] | null
}

/** A drag-and-drop move within or across phases (feature 010). */
@InputType()
export class MoveDeliverableInput {
  @Field(() => ID) @IsString() id: string
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() phaseId?: string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() afterId?: string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() beforeId?: string | null
}

@InputType()
export class ReviewDeliverableInput {
  @Field(() => ID) @IsString() id: string
  @Field(() => ReviewOutcome) @IsEnum(ReviewOutcome) outcome: ReviewOutcome
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(2000) note?:
    string | null
}
