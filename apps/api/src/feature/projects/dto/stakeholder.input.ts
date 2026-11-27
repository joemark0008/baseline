import { Field, ID, InputType } from '@nestjs/graphql'
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator'

@InputType()
export class AddStakeholderInput {
  @Field(() => ID) @IsString() projectId: string
  @Field() @IsString() @Length(1, 120) name: string
  @Field() @IsString() @Length(1, 120) organization: string
  @Field() @IsString() @Length(1, 120) role: string
  @Field(() => String, { nullable: true }) @IsOptional() @IsEmail() email?: string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(40) phone?:
    string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() userId?: string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(2000) notes?:
    string | null
}

@InputType()
export class UpdateStakeholderInput {
  @Field(() => ID) @IsString() id: string
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @Length(1, 120) name?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @Length(1, 120) organization?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @Length(1, 120) role?:
    string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsEmail() email?: string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(40) phone?:
    string | null
  @Field(() => ID, { nullable: true }) @IsOptional() @IsString() userId?: string | null
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(2000) notes?:
    string | null
}
