import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class TrackCarrierDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number; // meters per second

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number; // degrees 0-360

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number; // meters, estimated GPS accuracy
}
