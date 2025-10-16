import { ApiProperty } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';

export class PromoCodeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ enum: DiscountType })
  discount_type: DiscountType;

  @ApiProperty()
  discount_value: number;

  @ApiProperty({ required: false })
  min_order_amount?: number;

  @ApiProperty({ required: false })
  max_discount?: number;

  @ApiProperty({ required: false })
  usage_limit?: number;

  @ApiProperty()
  used_count: number;

  @ApiProperty({ required: false })
  user_limit?: number;

  @ApiProperty()
  valid_from: Date;

  @ApiProperty()
  valid_until: Date;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({ required: false })
  remaining_uses?: number;

  @ApiProperty({ required: false })
  is_valid?: boolean;
}
