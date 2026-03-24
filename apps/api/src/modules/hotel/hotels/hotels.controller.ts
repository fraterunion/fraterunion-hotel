import { Controller, Get, Param } from '@nestjs/common';
import { HotelsService } from './hotels.service';

@Controller('admin/hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}
  @Get(':slug') getHotel(@Param('slug') slug: string) { return this.hotelsService.findBySlug(slug); }
}
