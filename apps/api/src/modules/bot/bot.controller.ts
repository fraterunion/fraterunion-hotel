import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('whatsapp/webhook')
  @HttpCode(HttpStatus.OK)
  handleWhatsappWebhook(@Body() body: any) {
    console.log('[BotController] POST /bot/whatsapp/webhook body:', body);
    return { received: true };
  }
}
