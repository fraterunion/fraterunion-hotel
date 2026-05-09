import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoomTypesService } from './room-types.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { AddRoomTypeImageDto, ReorderRoomTypeImagesDto } from './dto/room-type-image.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUserType } from '../../../common/types/current-user.type';

@UseGuards(JwtAuthGuard)
@Controller('admin/room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserType) {
    return this.roomTypesService.findAll(user.tenantId, user.hotelId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.roomTypesService.findOne(user.tenantId, user.hotelId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateRoomTypeDto,
  ) {
    return this.roomTypesService.create(user.tenantId, user.hotelId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdateRoomTypeDto,
  ) {
    return this.roomTypesService.update(user.tenantId, user.hotelId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.roomTypesService.remove(user.tenantId, user.hotelId, id);
  }

  @Post(':id/images')
  async addImage(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: AddRoomTypeImageDto,
  ) {
    return this.roomTypesService.addImage(user.tenantId, user.hotelId, id, dto);
  }

  @Delete(':id/images/:imageId')
  async removeImage(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.roomTypesService.removeImage(user.tenantId, user.hotelId, id, imageId);
  }

  @Put(':id/images/reorder')
  async reorderImages(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: ReorderRoomTypeImagesDto,
  ) {
    return this.roomTypesService.reorderImages(user.tenantId, user.hotelId, id, dto.imageIds);
  }

  @Post(':id/images/import-static')
  async importStaticImages(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.roomTypesService.importStaticImages(user.tenantId, user.hotelId, id);
  }

  @Post(':id/images/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadImage(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.roomTypesService.addImageFromUpload(
      user.tenantId,
      user.hotelId,
      id,
      file.buffer,
    );
  }
}