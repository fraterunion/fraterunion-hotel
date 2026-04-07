import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUserType } from '../../../common/types/current-user.type';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserType) {
    return this.roomsService.findAll(user.tenantId, user.hotelId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.roomsService.findOne(user.tenantId, user.hotelId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.create(user.tenantId, user.hotelId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(user.tenantId, user.hotelId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.roomsService.remove(user.tenantId, user.hotelId, id);
  }
}