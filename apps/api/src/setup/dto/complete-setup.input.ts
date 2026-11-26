import { Field, InputType } from '@nestjs/graphql'
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

@InputType()
export class CompleteSetupInput {
  @Field({ description: 'The setup token printed in the API log.' })
  @IsString()
  @IsNotEmpty()
  token: string

  @Field() @IsString() @MinLength(2) name: string

  @Field() @IsEmail() email: string

  @Field() @IsString() @IsNotEmpty() password: string
}
