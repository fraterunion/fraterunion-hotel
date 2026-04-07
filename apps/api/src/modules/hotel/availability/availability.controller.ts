import { Body, Controller, Post } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { SearchAvailabilityDto } from './dto/search-availability.dto';

@Controller('public/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post('search')
  async search(@Body() dto: SearchAvailabilityDto) {
    return this.availabilityService.search(dto);
  }
}