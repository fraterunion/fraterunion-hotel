import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateRoomTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacityAdults?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityChildren?: number;

  @IsOptional()
  @IsString()
  bedType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeM2?: number;
}