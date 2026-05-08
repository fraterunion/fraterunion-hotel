import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserType } from '../../common/types/current-user.type';
import { BotMetricsService } from './bot.metrics.service';

@Controller()
export class BotMetricsController {
  constructor(private readonly botMetricsService: BotMetricsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('admin/analytics/ai-concierge/overview')
  async getOverview(
    @CurrentUser() user: CurrentUserType,
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const now = new Date();
    const to = toStr
      ? new Date(`${toStr}T23:59:59.999Z`)
      : now;
    const from = fromStr
      ? new Date(`${fromStr}T00:00:00.000Z`)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.botMetricsService.getOverview({
      hotelId: user.hotelId ?? '',
      from,
      to,
    });
  }
}
