import { Controller, Get, Param } from '@nestjs/common';
import { CheckoutShortLinksService } from './checkout-short-links.service';

@Controller('public/short-links')
export class CheckoutShortLinksController {
  constructor(private readonly service: CheckoutShortLinksService) {}

  @Get(':code')
  async resolve(@Param('code') code: string): Promise<{ stripeUrl: string }> {
    const { stripeUrl, id } = await this.service.resolveShortLink(code);
    // Fire-and-forget click tracking — errors are caught inside trackClick
    void this.service.trackClick(id);
    return { stripeUrl };
  }
}
