import { Field, ID, InputType } from '@nestjs/graphql'
import { IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator'
import { DeliverableKind } from '../entities/enums.js'

@InputType()
export class AddTemplatePhaseInput {
  @Field() @IsString() @Length(1, 80) name: string
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(500) description?:
    string | null
}

@InputType()
export class UpdateTemplatePhaseInput {
  @Field(() => ID) @IsString() id: string
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @Length(1, 80) name?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(500) description?:
    string | null
}

@InputType()
export class AddTemplateDeliverableInput {
  @Field(() => ID) @IsString() templatePhaseId: string
  @Field() @IsString() @Length(1, 120) title: string
  @Field(() => DeliverableKind, { nullable: true })
  @IsOptional()
  @IsEnum(DeliverableKind)
  kind?: DeliverableKind | null
}
