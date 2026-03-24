import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRoomTypeDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  basePrice!: number;

  @IsInt()
  @Min(1)
  capacityAdults!: number;

  @IsInt()
  @Min(0)
  capacityChildren!: number;

  @IsOptional()
  @IsString()
  bedType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeM2?: number;
}