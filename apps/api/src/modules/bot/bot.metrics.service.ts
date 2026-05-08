import { Injectable, Logger } from '@nestjs/common';
import { BotEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type TopCabin = {
  roomTypeId: string;
  name: string;
  views: number;
  selections: number;
  payments: number;
  revenue: number;
};

export type AiConciergeOverview = {
  status: 'ready' | 'empty' | 'not_ready';
  message?: string;
  range: { from: string; to: string };
  kpis: {
    conversations: number;
    availabilityShown: number;
    cabinInfoViews: number;
    cabinsSelected: number;
    checkoutLinksGenerated: number;
    paymentsCompleted: number;
    revenue: number;
    conversionRate: number;
  };
  funnel: { label: string; value: number }[];
  topCabins: TopCabin[];
  followUps: {
    sent: number;
    recoveredPayments: number;
    recoveredRevenue: number;
  };
};

// Mirrors the guard used in bot.follow-up.service.ts
function isTableMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as any)?.code as string | undefined;
  const message = String((err as any)?.message ?? '');
  if (code === 'P2021') return true;
  if (code === 'P2010' && message.includes('bot_events')) return true;
  if (message.includes('relation "bot_events" does not exist')) return true;
  return false;
}

@Injectable()
export class BotMetricsService {
  private readonly logger = new Logger(BotMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(params: {
    hotelId: string;
    from: Date;
    to: Date;
  }): Promise<AiConciergeOverview> {
    const { hotelId, from, to } = params;

    const rangeStr = {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };

    const zeroKpis = {
      conversations: 0, availabilityShown: 0, cabinInfoViews: 0,
      cabinsSelected: 0, checkoutLinksGenerated: 0, paymentsCompleted: 0,
      revenue: 0, conversionRate: 0,
    };

    const zeroFunnel = [
      { label: 'Conversaciones', value: 0 },
      { label: 'Disponibilidad vista', value: 0 },
      { label: 'Cabaña seleccionada', value: 0 },
      { label: 'Link de pago generado', value: 0 },
      { label: 'Pago completado', value: 0 },
    ];

    const notReady = (): AiConciergeOverview => ({
      status: 'not_ready',
      message: 'Analytics infrastructure is not ready yet.',
      range: rangeStr,
      kpis: zeroKpis,
      funnel: zeroFunnel,
      topCabins: [],
      followUps: { sent: 0, recoveredPayments: 0, recoveredRevenue: 0 },
    });

    if (!hotelId) return notReady();

    const where = { hotelId, createdAt: { gte: from, lte: to } };

    try {
      // ── Count events by type in one query ────────────────────────────────────
      const grouped = await this.prisma.botEvent.groupBy({
        by: ['eventType'],
        where,
        _count: { id: true },
      });

      const counts = new Map(grouped.map((g) => [g.eventType, g._count.id]));
      const get = (t: BotEventType) => counts.get(t) ?? 0;

      // ── Short-circuit: empty state ────────────────────────────────────────────
      const conversations = get(BotEventType.CONVERSATION_STARTED);
      if (counts.size === 0 || conversations === 0) {
        return {
          status: 'empty',
          message:
            'Analytics will appear here once the AI Concierge starts receiving conversations.',
          range: rangeStr,
          kpis: zeroKpis,
          funnel: zeroFunnel,
          topCabins: [],
          followUps: { sent: 0, recoveredPayments: 0, recoveredRevenue: 0 },
        };
      }

      // ── Revenue from PAYMENT_COMPLETED metadata ───────────────────────────────
      const paymentEvents = await this.prisma.botEvent.findMany({
        where: { ...where, eventType: BotEventType.PAYMENT_COMPLETED },
        select: { metadata: true },
      });
      const revenue = paymentEvents.reduce((sum, e) => {
        const meta = e.metadata as { totalAmount?: number } | null;
        return sum + (typeof meta?.totalAmount === 'number' ? meta.totalAmount : 0);
      }, 0);

      // ── KPIs ──────────────────────────────────────────────────────────────────
      const paymentsCompleted = get(BotEventType.PAYMENT_COMPLETED);
      const conversionRate =
        conversations > 0
          ? Math.round((paymentsCompleted / conversations) * 10000) / 100
          : 0;

      // ── Top cabins ────────────────────────────────────────────────────────────
      const cabinEvents = await this.prisma.botEvent.findMany({
        where: {
          ...where,
          eventType: {
            in: [
              BotEventType.CABIN_INFO_VIEWED,
              BotEventType.CABIN_SELECTED,
              BotEventType.PAYMENT_COMPLETED,
            ],
          },
          roomTypeId: { not: null },
        },
        select: { eventType: true, roomTypeId: true, metadata: true },
      });

      const cabinMap = new Map<
        string,
        { views: number; selections: number; payments: number; revenue: number }
      >();
      for (const e of cabinEvents) {
        if (!e.roomTypeId) continue;
        const entry = cabinMap.get(e.roomTypeId) ?? {
          views: 0, selections: 0, payments: 0, revenue: 0,
        };
        if (e.eventType === BotEventType.CABIN_INFO_VIEWED) entry.views++;
        if (e.eventType === BotEventType.CABIN_SELECTED) entry.selections++;
        if (e.eventType === BotEventType.PAYMENT_COMPLETED) {
          entry.payments++;
          const meta = e.metadata as { totalAmount?: number } | null;
          entry.revenue += typeof meta?.totalAmount === 'number' ? meta.totalAmount : 0;
        }
        cabinMap.set(e.roomTypeId, entry);
      }

      const cabinIds = Array.from(cabinMap.keys());
      const roomTypes =
        cabinIds.length > 0
          ? await this.prisma.roomType.findMany({
              where: { id: { in: cabinIds } },
              select: { id: true, name: true },
            })
          : [];
      const nameMap = new Map(roomTypes.map((r) => [r.id, r.name]));

      const topCabins: TopCabin[] = cabinIds
        .map((id) => ({
          roomTypeId: id,
          name: nameMap.get(id) ?? id,
          ...cabinMap.get(id)!,
        }))
        .sort((a, b) => b.payments - a.payments || b.views - a.views)
        .slice(0, 5);

      // ── Follow-up recovery attribution ────────────────────────────────────────
      const followUpsSent = get(BotEventType.FOLLOWUP_SENT);
      let recoveredPayments = 0;
      let recoveredRevenue = 0;

      if (followUpsSent > 0) {
        const followUpEvents = await this.prisma.botEvent.findMany({
          where: {
            ...where,
            eventType: BotEventType.FOLLOWUP_SENT,
            reservationId: { not: null },
          },
          select: { reservationId: true, createdAt: true },
        });

        if (followUpEvents.length > 0) {
          const reservationIds = [
            ...new Set(followUpEvents.map((e) => e.reservationId!)),
          ];
          const paymentsAfter = await this.prisma.botEvent.findMany({
            where: {
              hotelId,
              eventType: BotEventType.PAYMENT_COMPLETED,
              reservationId: { in: reservationIds },
            },
            select: { reservationId: true, createdAt: true, metadata: true },
          });

          for (const payment of paymentsAfter) {
            const followUp = followUpEvents.find(
              (f) => f.reservationId === payment.reservationId,
            );
            if (followUp && payment.createdAt > followUp.createdAt) {
              recoveredPayments++;
              const meta = payment.metadata as { totalAmount?: number } | null;
              recoveredRevenue +=
                typeof meta?.totalAmount === 'number' ? meta.totalAmount : 0;
            }
          }
        }
      }

      return {
        status: 'ready',
        range: rangeStr,
        kpis: {
          conversations,
          availabilityShown: get(BotEventType.AVAILABILITY_SHOWN),
          cabinInfoViews: get(BotEventType.CABIN_INFO_VIEWED),
          cabinsSelected: get(BotEventType.CABIN_SELECTED),
          checkoutLinksGenerated: get(BotEventType.CHECKOUT_LINK_GENERATED),
          paymentsCompleted,
          revenue,
          conversionRate,
        },
        funnel: [
          { label: 'Conversaciones', value: conversations },
          { label: 'Disponibilidad vista', value: get(BotEventType.AVAILABILITY_SHOWN) },
          { label: 'Cabaña seleccionada', value: get(BotEventType.CABIN_SELECTED) },
          { label: 'Link de pago generado', value: get(BotEventType.CHECKOUT_LINK_GENERATED) },
          { label: 'Pago completado', value: paymentsCompleted },
        ],
        topCabins,
        followUps: {
          sent: followUpsSent,
          recoveredPayments,
          recoveredRevenue,
        },
      };
    } catch (err: unknown) {
      if (isTableMissingError(err)) {
        this.logger.warn('[BOT METRICS] bot_events table not found — returning not_ready');
        return notReady();
      }
      this.logger.error(
        `[BOT METRICS] Unexpected error in getOverview: ${(err as any)?.message}`,
      );
      return notReady();
    }
  }
}
