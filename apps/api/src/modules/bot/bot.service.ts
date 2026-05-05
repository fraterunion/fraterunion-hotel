import { Injectable } from '@nestjs/common';
import { BotAiService } from './bot.ai';

@Injectable()
export class BotService {
  constructor(private readonly botAiService: BotAiService) {}

  async handleIncomingMessage(payload: { from: string; message: string }): Promise<string> {
    console.log('[BOT SERVICE]', payload);
    return this.botAiService.generateResponse(payload);
  }
}
