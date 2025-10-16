// src/modules/application/reviews/dto/review-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rating: number;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  author: {
    id: string;
    name: string;
    avatar?: string;
  };

  @ApiProperty()
  target: {
    id: string;
    name: string;
    avatar?: string;
  };

  @ApiProperty()
  mission: {
    id: string;
    pickup_address: string;
    delivery_address: string;
  };
}