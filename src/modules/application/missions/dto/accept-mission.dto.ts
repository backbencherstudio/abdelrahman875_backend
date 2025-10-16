import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptMissionDto {
  @ApiProperty({ description: 'Carrier message to shipper', required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: 'Estimated pickup time', required: false })
  @IsOptional()
  @IsString()
  estimated_pickup_time?: string;
}
