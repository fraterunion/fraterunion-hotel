import { IsArray, IsOptional, IsString } from 'class-validator';

export class AddRoomTypeImageDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  altText?: string;
}

export class ReorderRoomTypeImagesDto {
  @IsArray()
  @IsString({ each: true })
  imageIds!: string[];
}
