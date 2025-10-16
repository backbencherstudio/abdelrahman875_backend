import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DocumentTypeEnum {
  ID_CARD = 'ID_CARD',
  KBIS = 'KBIS',
  INSURANCE_CERTIFICATE = 'INSURANCE_CERTIFICATE',
  RIB = 'RIB',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  PROFILE_PHOTO = 'PROFILE_PHOTO',
  URSSAF_CERTIFICATE = 'URSSAF_CERTIFICATE',
  TRANSPORT_LICENSE = 'TRANSPORT_LICENSE',
  SEPA_MANDATE = 'SEPA_MANDATE',
  PROFESSIONAL_LIABILITY_INSURANCE = 'PROFESSIONAL_LIABILITY_INSURANCE',
}

export class UploadDocumentDto {
  @ApiProperty({ enum: DocumentTypeEnum, description: 'Type of document' })
  @IsEnum(DocumentTypeEnum)
  type: DocumentTypeEnum;

  @ApiProperty({ required: false, description: 'Custom file name' })
  @IsOptional()
  @IsString()
  file_name?: string;

  @ApiProperty({ required: false, description: 'File size in bytes' })
  @IsOptional()
  file_size?: number;
}
