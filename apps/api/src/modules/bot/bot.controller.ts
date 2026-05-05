import { Controller, Post, Body, Req, Res, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { validateRequest } from 'twilio';
import { BotService } from './bot.service';

// Production webhook URL registered with Twilio.
// Override via TWILIO_WEBHOOK_URL env var if the domain changes.
const PRODUCTION_WEBHOOK_URL =
  'https://fraterunionapi-production.up.railway.app/api/bot/whatsapp/webhook';

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
  private readonly logger = new Logger(BotController.name);

  constructor(
    private readonly botService: BotService,
    private readonly configService: ConfigService,
  ) {}

  @Post('whatsapp/webhook')
  async handleWhatsappWebhook(@Req() req: Request, @Body() body: any, @Res() res: Response) {
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    if (!authToken) {
      if (isProduction) {
        this.logger.error('TWILIO_AUTH_TOKEN not set in production — rejecting request');
        return res.status(403).send('Forbidden');
      }
      // Non-production: allow through with a warning so local dev still works
      this.logger.warn('TWILIO_AUTH_TOKEN not set — skipping signature validation (non-production)');
    } else {
      const signature = (req.headers['x-twilio-signature'] as string) ?? '';
      const webhookUrl =
        this.configService.get<string>('TWILIO_WEBHOOK_URL') ?? PRODUCTION_WEBHOOK_URL;

      const isValid = validateRequest(authToken, signature, webhookUrl, body ?? {});

      if (!isValid) {
        this.logger.warn(`Twilio signature validation failed — request rejected`);
        return res.status(403).send('Forbidden');
      }
    }

    const messageBody: string = body?.Body ?? '';
    const sender: string = body?.From ?? '';

    console.log('[BOT] Incoming message:', { from: sender, message: messageBody });

    const responseText = await this.botService.handleIncomingMessage({ from: sender, message: messageBody });

    const xml = `<Response><Message>${escapeXml(responseText)}</Message></Response>`;

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(xml);
  }
}
