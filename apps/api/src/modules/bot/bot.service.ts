import { Injectable } from '@nestjs/common';

@Injectable()
export class BotService {
  handleIncomingMessage(payload: any): void {
    console.log('[BotService] incoming message:', payload);
  }
}
