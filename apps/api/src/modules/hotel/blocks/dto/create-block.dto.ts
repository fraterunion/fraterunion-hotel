import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBlockDto {
  @IsString()
  roomTypeId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
