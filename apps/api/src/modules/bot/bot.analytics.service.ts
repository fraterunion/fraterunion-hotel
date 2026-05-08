import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BotEventType, Prisma } from '@prisma/client';

type TrackParams = {
  hotelId: string;
  whatsappFrom: string | null;
  eventType: BotEventType;
  sessionId?: string;
  roomTypeId?: string;
  reservationId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class BotAnalyticsService {
  private readonly logger = new Logger(BotAnalyticsService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.enabled =
      configService.get<string>('ANALYTICS_ENABLED') === 'true';
    if (!this.enabled) {
      this.logger.log('[BOT ANALYTICS] disabled');
    }
  }

  private async trackEvent(params: TrackParams): Promise<void> {
    if (!this.enabled) return;
    if (!params.hotelId) {
      this.logger.warn(
        `[BOT ANALYTICS] trackEvent called with empty hotelId (event=${params.eventType}) — skipping`,
      );
      return;
    }
    try {
      const { metadata, ...rest } = params;
      await this.prisma.botEvent.create({
        data: {
          ...rest,
          ...(metadata !== undefined && { metadata: metadata as Prisma.InputJsonValue }),
        },
      });
    } catch (err: any) {
      this.logger.error(
        `[BOT ANALYTICS] trackEvent failed (event=${params.eventType}): ${err?.message}`,
      );
    }
  }

  async trackConversationStarted(params: {
    hotelId: string;
    whatsappFrom: string;
    sessionId?: string;
  }): Promise<void> {
    await this.trackEvent({
      ...params,
      eventType: BotEventType.CONVERSATION_STARTED,
    });
  }

  async trackDatesProvided(params: {
    hotelId: string;
    whatsappFrom: string;
    sessionId?: string;
    metadata?: { checkIn: string; checkOut: string; nights: number };
  }): Promise<void> {
    await this.trackEvent({
      ...params,
      eventType: BotEventType.DATES_PROVIDED,
    });
  }

  async trackAvailabilityShown(params: {
    hotelId: string;
    whatsappFrom: string;
    sessionId?: string;
    metadata?: { cabinCount: number };
  }): Promise<void> {
    await this.trackEvent({
      ...params,
      eventType: BotEventType.AVAILABILITY_SHOWN,
    });
  }

  async trackCabinInfoViewed(params: {
    hotelId: string;
    whatsappFrom: string;
    sessionId?: string;
    roomTypeId: string;
    metadata?: { cabinName: string; position: number };
  }): Promise<void> {
    await this.trackEvent({
      ...params,
      eventType: BotEventType.CABIN_INFO_VIEWED,
    });
  }

  async trackCabinSelected(params: {
    hotelId: string;
    whatsappFrom: string;
    sessionId?: string;
    roomTypeId: string;
    metadata?: { cabinName: string; priceFrom: number };
  }): Promise<void> {
    await this.trackEvent({
      ...params,
      eventType: BotEventType.CABIN_SELECTED,
    });
  }

  async trackCheckoutStarted(params: {
    hotelId: string;
    whatsappFrom: string;
    sessionId?: string;
    roomTypeId: string;
    metadata?: { cabinName: string };
  }): Promise<void> {
    await this.trackEvent({
      ...params,
      eventType: BotEventType.CHECKOUT_STARTED,
    });
  }

  async trackPeopleProvided(params: {
    hotelId: string;
    whatsappFrom: string;
    sessionId?: string;
    metadata?: { adults: number };
  }): Promise<void> {
    await this.trackEvent({
      ...params,
      eventType: BotEventType.PEOPLE_PROVIDED,
    });
  }

  async trackEmailProvided(params: {
    hotelId: string;
    whatsappFrom: string;
    sessionId?: string;
  }): Promise<void> {
    await this.trackEvent({
      ...params,
      eventType: BotEventType.EMAIL_PROVIDED,
    });
  }

  async trackCheckoutLinkGenerated(params: {
    hotelId: string;
    whatsappFrom: string;
    sessionId?: string;
    reservationId: string;
    roomTypeId?: string;
    metadata?: { nights: number; quoteAmount: number; currency: string };
  }): Promise<void> {
    await this.trackEvent({
      ...params,
      eventType: BotEventType.CHECKOUT_LINK_GENERATED,
      metadata: { ...params.metadata, checkoutUrlGenerated: true },
    });
  }

  async trackFollowUpSent(params: {
    hotelId: string;
    whatsappFrom: string;
    reservationId: string;
    metadata?: { attempt: number };
  }): Promise<void> {
    await this.trackEvent({
      ...params,
      eventType: BotEventType.FOLLOWUP_SENT,
    });
  }

  async trackPaymentCompleted(params: {
    hotelId: string;
    reservationId: string;
    metadata?: { totalAmount: number; currency: string };
  }): Promise<void> {
    if (!this.enabled) return;
    let whatsappFrom: string | null = null;
    try {
      const origin = await this.prisma.botEvent.findFirst({
        where: {
          reservationId: params.reservationId,
          eventType: BotEventType.CHECKOUT_LINK_GENERATED,
        },
        select: { whatsappFrom: true },
      });
      whatsappFrom = origin?.whatsappFrom ?? null;
    } catch (err: any) {
      this.logger.warn(
        `[BOT ANALYTICS] trackPaymentCompleted: origin lookup failed — ${err?.message}`,
      );
    }
    await this.trackEvent({
      ...params,
      whatsappFrom,
      eventType: BotEventType.PAYMENT_COMPLETED,
    });
  }
}
