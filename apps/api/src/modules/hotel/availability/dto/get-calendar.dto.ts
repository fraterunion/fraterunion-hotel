import { Type } from 'class-transformer';
import { IsNumber, IsString, Max, Min } from 'class-validator';

export class GetCalendarDto {
  @IsString()
  hotelSlug!: string;

  @IsString()
  roomTypeSlug!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(2020)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month!: number;
}
