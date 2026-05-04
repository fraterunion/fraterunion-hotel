import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('whatsapp/webhook')
  handleWhatsappWebhook(@Body() body: any, @Res() res: Response) {
    const messageBody: string = body?.Body ?? '';
    const sender: string = body?.From ?? '';

    console.log('[BOT] Incoming message:', { from: sender, message: messageBody });

    this.botService.handleIncomingMessage({ from: sender, message: messageBody });

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send('<Response></Response>');
  }
}
