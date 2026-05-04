import { Injectable } from '@nestjs/common';

@Injectable()
export class BotService {
  handleIncomingMessage(payload: { from: string; message: string }): void {
    console.log('[BOT SERVICE]', payload);
  }
}
