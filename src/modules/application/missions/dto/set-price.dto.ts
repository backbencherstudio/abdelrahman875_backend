import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class SetPriceDto {
  @ApiProperty({ 
    description: 'New price for the mission (can only be increased)', 
    minimum: 1,
    example: 75
  })
  @IsNumber()
  @Min(1)
  price: number;
}
