import { IsOptional, IsString } from 'class-validator';

export class AssignRoomDto {
  @IsOptional()
  @IsString()
  roomId?: string;
}