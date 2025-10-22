import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UploadDocumentDto } from './upload-document.dto';

export enum UserTypeEnum {
  SHIPPER = 'shipper',
  CARRIER = 'carrier',
}

export class RegisterWithDocumentsDto {
  @ApiProperty({ required: false, description: 'Full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  first_name: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  last_name: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;

  @ApiProperty({ enum: UserTypeEnum, description: 'User type' })
  @IsEnum(UserTypeEnum)
  type: UserTypeEnum;

  @ApiProperty({
    type: [UploadDocumentDto],
    description: 'Documents to upload',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadDocumentDto)
  documents: UploadDocumentDto[];
}
