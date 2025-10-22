import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreatePromoCodeDto {
  @ApiProperty({ description: 'Unique promo code', example: 'SAVE20' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Description of the promo code',
    example: '20% off on first order',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Type of discount',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsNotEmpty()
  @IsEnum(DiscountType)
  discount_type: DiscountType;

  @ApiProperty({
    description: 'Discount value (percentage 0-100 or fixed amount)',
    example: 20,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  discount_value: number;

  @ApiProperty({
    description: 'Minimum order amount to use this code',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_amount?: number;

  @ApiProperty({
    description: 'Maximum discount amount (for percentage)',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_discount?: number;

  @ApiProperty({
    description: 'Total usage limit (null = unlimited)',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usage_limit?: number;

  @ApiProperty({
    description: 'Usage limit per user (null = unlimited)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  user_limit?: number;

  @ApiProperty({
    description: 'Valid from date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  valid_from: string;

  @ApiProperty({
    description: 'Valid until date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsNotEmpty()
  @IsDateString()
  valid_until: string;

  @ApiProperty({
    description: 'Is promo code active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
