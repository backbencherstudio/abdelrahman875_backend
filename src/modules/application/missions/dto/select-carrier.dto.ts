import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SelectCarrierDto {
  @ApiProperty({ 
    description: 'ID of the carrier to select for this mission',
    example: 'cmg7m945w0003iha43atwmx96'
  })
  @IsString()
  @IsNotEmpty()
  carrier_id: string;
}
