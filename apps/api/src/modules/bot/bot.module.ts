import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { BotAiService } from './bot.ai';

@Module({
  controllers: [BotController],
  providers: [BotService, BotAiService],
})
export class BotModule {}
