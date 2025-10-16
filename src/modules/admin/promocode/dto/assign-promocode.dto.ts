import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray } from 'class-validator';

export class AssignPromoCodeDto {
  @ApiProperty({ description: 'Promo code ID', example: 'cmg7vj0ge0000ihkostrc8mc4' })
  @IsNotEmpty()
  @IsString()
  promo_code_id: string;

  @ApiProperty({ 
    description: 'Array of user IDs to assign this promo code to', 
    example: ['cmg7vj0ge0000ihkostrc8mc4', 'cmg7vxtif000dihko1h2t6u1w'],
    type: [String]
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  user_ids: string[];
}
