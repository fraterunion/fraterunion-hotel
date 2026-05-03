import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { SearchAvailabilityDto } from './dto/search-availability.dto';
import { GetCalendarDto } from './dto/get-calendar.dto';

@Controller('public/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post('search')
  async search(@Body() dto: SearchAvailabilityDto) {
    return this.availabilityService.search(dto);
  }

  @Get('calendar')
  async getCalendar(@Query() dto: GetCalendarDto) {
    return this.availabilityService.getCalendar(dto);
  }
}
