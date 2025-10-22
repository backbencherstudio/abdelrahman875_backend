import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @ApiProperty({ required: false })
  name?: string;

  @IsNotEmpty()
  @ApiProperty()
  first_name?: string;

  @IsNotEmpty()
  @ApiProperty()
  last_name?: string;

  @IsNotEmpty()
  @ApiProperty()
  email?: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password should be minimum 8' })
  @ApiProperty()
  password: string;

  @ApiProperty({
    type: String,
    example: 'user',
  })
  type?: string;

  fcm_token?: string; // optional
  platform?: 'ios' | 'android';
}
