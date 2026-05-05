import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { BotService } from './bot.service';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('whatsapp/webhook')
  async handleWhatsappWebhook(@Body() body: any, @Res() res: Response) {
    const messageBody: string = body?.Body ?? '';
    const sender: string = body?.From ?? '';

    console.log('[BOT] Incoming message:', { from: sender, message: messageBody });

    const responseText = await this.botService.handleIncomingMessage({ from: sender, message: messageBody });

    const xml = `<Response><Message>${escapeXml(responseText)}</Message></Response>`;

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(xml);
  }
}
