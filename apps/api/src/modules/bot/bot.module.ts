import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { BotAiService } from './bot.ai';
import { BotAvailabilityService } from './bot.availability';

@Module({
  controllers: [BotController],
  providers: [BotService, BotAiService, BotAvailabilityService],
})
export class BotModule {}
