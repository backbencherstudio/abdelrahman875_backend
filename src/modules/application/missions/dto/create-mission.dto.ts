import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentType, TemperatureUnit } from '@prisma/client';

export enum TemperatureRange {
  FROZEN = 'FROZEN', // -18°C to 0°C
  REFRIGERATED = 'REFRIGERATED', // +0°C to +7°C
  AMBIENT = 'AMBIENT', // +15°C to +25°C
  CONTROLLED = 'CONTROLLED', // +2°C to +8°C
  OTHER = 'OTHER', // Custom temperature requirement
}

export class CreateMissionDto {
  // Shipment Type
  @ApiProperty({ enum: ShipmentType, description: 'Type of shipment' })
  @IsEnum(ShipmentType)
  shipment_type: ShipmentType;

  // Loading Details (Chargement)
  @ApiProperty({ description: 'Loading location' })
  @IsString()
  loading_location: string;

  @ApiProperty({ description: 'Loading address' })
  @IsString()
  loading_address: string;

  @ApiProperty({ description: 'Loading city' })
  @IsString()
  loading_city: string;

  @ApiProperty({ description: 'Loading postal code' })
  @IsString()
  loading_postal_code: string;

  @ApiProperty({ description: 'Shipper phone number' })
  @IsString()
  shipper_phone: string;

  @ApiProperty({ description: 'Loading date' })
  @IsDateString()
  loading_date: string;

  @ApiProperty({ description: 'Loading time' })
  @IsString()
  loading_time: string;

  @ApiProperty({ description: 'Loading instructions', required: false })
  @IsOptional()
  @IsString()
  loading_instructions?: string;

  @ApiProperty({ description: 'Loading staff name', required: false })
  @IsOptional()
  @IsString()
  loading_staff_name?: string;

  // Goods Details (Marchandise)
  @ApiProperty({ description: 'Type of goods' })
  @IsString()
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

  @ApiProperty({ description: 'Package length in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  length_m?: number;

  @ApiProperty({ description: 'Package width in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  width_m?: number;

  @ApiProperty({ description: 'Package height in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height_m?: number;

  @ApiProperty({ description: 'Package weight in kg' })
  @IsNumber()
  @Min(0)
  weight_kg: number;

  @ApiProperty({ description: 'Package volume in m³', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volume_m3?: number;

  @ApiProperty({ description: 'Is package fragile', required: false })
  @IsOptional()
  @IsBoolean()
  fragile?: boolean;

  // Delivery Details (Livraison)
  @ApiProperty({ description: 'Delivery location' })
  @IsString()
  delivery_location: string;

  @ApiProperty({ description: 'Delivery address' })
  @IsString()
  delivery_address: string;

  @ApiProperty({ description: 'Delivery city' })
  @IsString()
  delivery_city: string;

  @ApiProperty({ description: 'Delivery postal code' })
  @IsString()
  delivery_postal_code: string;

  @ApiProperty({ description: 'Recipient phone number' })
  @IsString()
  recipient_phone: string;

  @ApiProperty({ description: 'Delivery date' })
  @IsDateString()
  delivery_date: string;

  @ApiProperty({ description: 'Delivery time' })
  @IsString()
  delivery_time: string;

  @ApiProperty({ description: 'Delivery instructions', required: false })
  @IsOptional()
  @IsString()
  delivery_instructions?: string;

  @ApiProperty({ description: 'Recipient name' })
  @IsString()
  recipient_name: string;

  @ApiProperty({ description: 'Message for recipient', required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({
    description: 'Delivery message for recipient',
    required: false,
  })
  @IsOptional()
  @IsString()
  delivery_message?: string;

  @ApiProperty({ description: 'Total distance in km', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance_km?: number;
}
