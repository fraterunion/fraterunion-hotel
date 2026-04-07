import { IsDateString, IsString } from 'class-validator';

export class SearchAvailabilityDto {
  @IsString()
  hotelSlug!: string;

  @IsDateString()
  checkInDate!: string;

  @IsDateString()
  checkOutDate!: string;
}