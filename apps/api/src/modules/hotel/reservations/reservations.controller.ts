import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUserType } from '../../../common/types/current-user.type';
import { AssignRoomDto } from './dto/assign-room.dto';

@Controller()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('public/reservations')
  async createPublicReservation(@Body() dto: CreatePublicReservationDto) {
    return this.reservationsService.createPublicReservation(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/reservations')
  async findAdminReservations(
    @CurrentUser() user: CurrentUserType,
    @Query('status') status?: string,
  ) {
    return this.reservationsService.findAdminReservations(
      user.tenantId,
      user.hotelId,
      status,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/reservations/metrics/summary')
  async getReservationMetrics(@CurrentUser() user: CurrentUserType) {
    return this.reservationsService.getReservationMetrics(
      user.tenantId,
      user.hotelId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/reservations/:id')
  async findAdminReservationById(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.reservationsService.findAdminReservationById(
      user.tenantId,
      user.hotelId,
      id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/reservations/:id/assign-room')
  async assignRoom(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: AssignRoomDto,
  ) {
    return this.reservationsService.assignRoom(
      user.tenantId,
      user.hotelId,
      id,
      dto.roomId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/reservations/:id/check-in')
  async checkIn(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.reservationsService.checkIn(user.tenantId, user.hotelId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/reservations/:id/check-out')
  async checkOut(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.reservationsService.checkOut(user.tenantId, user.hotelId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/reservations/:id/cancel')
  async cancel(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.reservationsService.cancelReservation(user.tenantId, user.hotelId, id);
  }
}