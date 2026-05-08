import { Global, Module } from '@nestjs/common';
import { BotAnalyticsService } from './bot.analytics.service';

@Global()
@Module({
  providers: [BotAnalyticsService],
  exports: [BotAnalyticsService],
})
export class BotAnalyticsModule {}
