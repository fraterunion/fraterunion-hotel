import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { BotAiService } from './bot.ai';
import { BotAvailabilityService } from './bot.availability';
import { BotFollowUpService } from './bot.follow-up.service';

@Module({
  controllers: [BotController],
  providers: [BotService, BotAiService, BotAvailabilityService, BotFollowUpService],
})
export class BotModule {}
