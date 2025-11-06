import { ApiProperty } from '@nestjs/swagger';
import { MissionStatus, ShipmentType, TemperatureUnit } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class MissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  @ApiProperty({ enum: ShipmentType })
  shipment_type: ShipmentType;

  // Loading Details
  @ApiProperty()
  loading_location: string;

  @ApiProperty()
  loading_address: string;

  @ApiProperty()
  loading_city: string;

  @ApiProperty()
  loading_postal_code: string;

  @ApiProperty()
  shipper_phone: string;

  @ApiProperty()
  loading_date: string;

  @ApiProperty()
  loading_time: string;

  @ApiProperty({ required: false })
  loading_instructions?: string;

  @ApiProperty({ required: false })
  loading_staff_name?: string;

  // Goods Details
  @ApiProperty()
  goods_type: string;

  @ApiProperty({ description: 'Minimum temperature', required: true })
  @IsNumber()
  @Min(0)
  temp_min: number;

  @ApiProperty({ description: 'Maximum temperature', required: true })
  @IsNumber()
  @Min(0)
  temp_max: number;

  @ApiProperty({
    description: 'Temperature unit',
    enum: TemperatureUnit,
    required: false,
    default: TemperatureUnit.CELSIUS,
  })
  @IsEnum(TemperatureUnit)
  @IsOptional()
  tem_unit?: TemperatureUnit = TemperatureUnit.CELSIUS;

  @ApiProperty({ required: false })
  other_goods_type?: string;

  @ApiProperty({ required: false })
  length_m?: number;

  @ApiProperty({ required: false })
  width_m?: number;

  @ApiProperty({ required: false })
  height_m?: number;

  @ApiProperty()
  weight_kg: number;

  @ApiProperty({ required: false })
  volume_m3?: number;

  @ApiProperty({ required: false })
  fragile?: boolean;

  // Delivery Details
  @ApiProperty()
  delivery_location: string;

  @ApiProperty()
  delivery_address: string;

  @ApiProperty()
  delivery_city: string;

  @ApiProperty()
  delivery_postal_code: string;

  @ApiProperty()
  recipient_phone: string;

  @ApiProperty()
  delivery_date: string;

  @ApiProperty()
  delivery_time: string;

  @ApiProperty({ required: false })
  delivery_instructions?: string;

  @ApiProperty()
  recipient_name: string;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty()
  distance_km: number;

  // Pricing
  @ApiProperty()
  base_price: number;

  @ApiProperty()
  final_price: number;

  @ApiProperty()
  commission_rate: number;

  @ApiProperty()
  commission_amount: number;

  // Status
  @ApiProperty({ enum: MissionStatus })
  status: MissionStatus;

  // Relations
  @ApiProperty()
  shipper_id: string;

  @ApiProperty({ required: false })
  carrier_id?: string;

  // Document URLs
  @ApiProperty({ required: false })
  cmr_document_url?: string;

  @ApiProperty({ required: false })
  confirmation_document_url?: string;

  @ApiProperty({ required: false })
  invoice_document_url?: string;
}
