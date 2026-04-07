import { IsOptional, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  roomTypeId!: string;

  @IsString()
  roomNumber!: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}