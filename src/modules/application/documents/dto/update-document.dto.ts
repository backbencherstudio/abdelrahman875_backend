import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateDocumentDto {
  @ApiProperty({ 
    description: 'New file name for the document', 
    required: false,
    example: 'Updated ID Card Document.pdf'
  })
  @IsOptional()
  @IsString()
  file_name?: string;

  @ApiProperty({ 
    description: 'Expiration date for the document (ISO 8601 format)', 
    required: false,
    example: '2025-12-31T23:59:59.000Z'
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
