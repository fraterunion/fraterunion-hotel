import { Controller, Get, Param } from '@nestjs/common';
import { HotelsService } from '../hotels/hotels.service';

@Controller('public')
export class PublicController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get('hotel/:slug')
  getPublicHotel(@Param('slug') slug: string) {
    return this.hotelsService.findBySlug(slug);
  }

  @Get('catalog/:hotelSlug')
  getCatalog(@Param('hotelSlug') hotelSlug: string) {
    return this.hotelsService.getCatalog(hotelSlug);
  }
}
