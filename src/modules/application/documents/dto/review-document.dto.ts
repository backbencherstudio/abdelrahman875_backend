import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DocumentStatusEnum {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: DocumentStatusEnum, description: 'Review status' })
  @IsEnum(DocumentStatusEnum)
  status: DocumentStatusEnum;

  @ApiProperty({ required: false, description: 'Rejection reason if status is REJECTED' })
  @IsOptional()
  @IsString()
  rejection_reason?: string;
}
