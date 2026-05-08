import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BotMetricsController } from './bot.metrics.controller';
import { BotMetricsService } from './bot.metrics.service';

@Module({
  imports: [PrismaModule],
  controllers: [BotMetricsController],
  providers: [BotMetricsService],
})
export class BotMetricsModule {}
