import { Field, ID, InputType } from '@nestjs/graphql'
import { IsEnum, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator'
import { PhaseStatus } from '../entities/enums.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

@InputType()
export class AddPhaseInput {
  @Field(() => ID) @IsString() projectId: string
  @Field() @IsString() @Length(1, 80) name: string
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(500) description?:
    string | null
}

@InputType()
export class UpdatePhaseInput {
  @Field(() => ID) @IsString() id: string
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @Length(1, 80) name?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(500) description?:
    string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() ownerId?: string | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) startDate?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @Matches(ISO_DATE) endDate?: string | null
  @Field(() => PhaseStatus, { nullable: true })
  @IsOptional()
  @IsEnum(PhaseStatus)
  status?: PhaseStatus | null
}
