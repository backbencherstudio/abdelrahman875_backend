import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmPickupDto {
  @ApiProperty({ description: 'Carrier notes about loading', required: false })
  @IsOptional()
  @IsString()
  loading_notes?: string;

  @ApiProperty({ description: 'Special instructions at pickup', required: false })
  @IsOptional()
  @IsString()
  special_instructions?: string;
}
