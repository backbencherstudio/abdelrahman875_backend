import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DocumentStatusQueryEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export class GetDocumentsByStatusDto {
  @ApiProperty({ enum: DocumentStatusQueryEnum, description: 'Document status to filter by' })
  @IsEnum(DocumentStatusQueryEnum)
  status: DocumentStatusQueryEnum;
}
