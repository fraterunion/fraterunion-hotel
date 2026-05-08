import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { FollowUpStatus, PaymentStatus } from '@prisma/client';
import twilio from 'twilio';
import { BotAnalyticsService } from './bot.analytics.service';

type TwilioClient = ReturnType<typeof twilio>;

type FollowUpRow = {
  id: string;
  hotelId: string;
  reservationId: string;
  whatsappFrom: string;
  guestFirstName: string;
  checkoutUrl: string;
  sentCount: number;
  maxAttempts: number;
  createdAt: Date;
  reservation: { paymentStatus: PaymentStatus };
};

// Detects Prisma/Postgres errors caused by a missing table (migration not yet run).
// P2021 = "The table does not exist in the current database."
// P2010 wraps raw DB errors; the Postgres code 42P01 surfaces in the message.
function isTableMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as any)?.code as string | undefined;
  const message = String((err as any)?.message ?? '');
  if (code === 'P2021') return true;
  if (code === 'P2010' && message.includes('bot_checkout_follow_ups')) return true;
  if (message.includes('relation "bot_checkout_follow_ups" does not exist')) return true;
  return false;
}

@Injectable()
export class BotFollowUpService {
  private readonly logger = new Logger(BotFollowUpService.name);
  private readonly enabled: boolean;
  private readonly twilioClient: TwilioClient | null;
  private readonly twilioWhatsappFrom: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly analyticsService: BotAnalyticsService,
  ) {
    this.enabled =
      configService.get<string>('FOLLOWUPS_ENABLED') === 'true';

    if (!this.enabled) {
      this.logger.log('[BOT FOLLOWUP] disabled');
      this.twilioClient = null;
      this.twilioWhatsappFrom = null;
      return;
    }

    const accountSid = configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioWhatsappFrom =
      configService.get<string>('TWILIO_WHATSAPP_FROM') ?? null;

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      this.logger.log('[BOT FOLLOWUP] Twilio client initialized');
    } else {
      this.twilioClient = null;
      this.logger.warn(
        '[BOT FOLLOWUP] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set — outbound sends disabled',
      );
    }
  }

  async scheduleFollowUp(params: {
    reservationId: string;
    whatsappFrom: string;
    guestFirstName: string;
    checkoutUrl: string;
  }): Promise<void> {
    if (!this.enabled) return;

    try {
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: params.reservationId },
        select: { hotelId: true, paymentStatus: true },
      });

      if (!reservation) {
        this.logger.warn(
          `[BOT FOLLOWUP] Reservation ${params.reservationId} not found — skipping`,
        );
        return;
      }

      if (reservation.paymentStatus === PaymentStatus.PAID) {
        this.logger.log(
          `[BOT FOLLOWUP] Reservation ${params.reservationId} already PAID — skipping`,
        );
        return;
      }

      const nextSendAt = new Date(Date.now() + 30 * 60 * 1000);

      await this.prisma.botCheckoutFollowUp.create({
        data: {
          hotelId: reservation.hotelId,
          reservationId: params.reservationId,
          whatsappFrom: params.whatsappFrom,
          guestFirstName: params.guestFirstName,
          checkoutUrl: params.checkoutUrl,
          nextSendAt,
          sentCount: 0,
          maxAttempts: 2,
          status: FollowUpStatus.PENDING,
        },
      });

      this.logger.log(
        `[BOT FOLLOWUP] Scheduled for reservation ${params.reservationId}, nextSendAt=${nextSendAt.toISOString()}`,
      );
    } catch (err: unknown) {
      if (isTableMissingError(err)) {
        this.logger.warn(
          '[BOT FOLLOWUP] table not ready — skipping follow-up schedule',
        );
        return;
      }
      throw err;
    }
  }

  @Cron('*/5 * * * *')
  async runFollowUps(): Promise<void> {
    if (!this.enabled) return;

    const now = new Date();

    let rows: FollowUpRow[];
    try {
      rows = (await this.prisma.botCheckoutFollowUp.findMany({
        where: {
          status: FollowUpStatus.PENDING,
          nextSendAt: { lte: now },
        },
        include: {
          reservation: { select: { paymentStatus: true } },
        },
        take: 50,
      })) as FollowUpRow[];
    } catch (err: unknown) {
      if (isTableMissingError(err)) {
        this.logger.warn(
          '[BOT FOLLOWUP] table not ready — skipping follow-up cron',
        );
        return;
      }
      this.logger.error(
        `[BOT FOLLOWUP] cron query failed: ${(err as any)?.message}`,
      );
      return;
    }

    if (!rows.length) return;

    this.logger.log(
      `[BOT FOLLOWUP] Processing ${rows.length} pending follow-up(s)`,
    );

    for (const row of rows) {
      try {
        await this.processFollowUp(row, now);
      } catch (err: any) {
        this.logger.error(
          `[BOT FOLLOWUP] Failed for row ${row.id}: ${err?.message}`,
        );
      }
    }
  }

  private async processFollowUp(row: FollowUpRow, now: Date): Promise<void> {
    // 1. Never send to a paid reservation
    if (row.reservation.paymentStatus === PaymentStatus.PAID) {
      await this.prisma.botCheckoutFollowUp.update({
        where: { id: row.id },
        data: { status: FollowUpStatus.COMPLETED },
      });
      this.logger.log(
        `[BOT FOLLOWUP] Reservation ${row.reservationId} PAID — marked COMPLETED`,
      );
      return;
    }

    // 2. Expire rows older than 20 hours (Stripe session likely expired)
    if (now.getTime() - row.createdAt.getTime() > 20 * 60 * 60 * 1000) {
      await this.prisma.botCheckoutFollowUp.update({
        where: { id: row.id },
        data: { status: FollowUpStatus.CANCELLED },
      });
      this.logger.log(
        `[BOT FOLLOWUP] Row ${row.id} older than 20h — marked CANCELLED`,
      );
      return;
    }

    // 3. Resolve template SID for this attempt
    const templateSid =
      row.sentCount === 0
        ? this.configService.get<string>('TWILIO_FOLLOWUP_TEMPLATE_1')
        : this.configService.get<string>('TWILIO_FOLLOWUP_TEMPLATE_2');

    if (!templateSid) {
      this.logger.warn(
        `[BOT FOLLOWUP] No template SID for sentCount=${row.sentCount} (row ${row.id}) — skipping until env var is set`,
      );
      return;
    }

    // 4. Twilio must be configured
    if (!this.twilioClient || !this.twilioWhatsappFrom) {
      this.logger.warn(
        `[BOT FOLLOWUP] Twilio not configured — skipping row ${row.id}`,
      );
      return;
    }

    // 5. Send outbound WhatsApp template message.
    // contentSid/contentVariables are valid Twilio Content API fields not reflected in the v6 SDK type definitions.
    await (this.twilioClient.messages.create as unknown as (opts: unknown) => Promise<unknown>)({
      from: this.twilioWhatsappFrom,
      to: row.whatsappFrom,
      contentSid: templateSid,
      contentVariables: JSON.stringify({
        '1': row.guestFirstName,
        '2': row.checkoutUrl,
      }),
    });

    this.logger.log(
      `[BOT FOLLOWUP] Sent to ${row.whatsappFrom} (reservationId=${row.reservationId}, attempt=${row.sentCount + 1})`,
    );

    this.analyticsService
      .trackFollowUpSent({
        hotelId: row.hotelId,
        whatsappFrom: row.whatsappFrom,
        reservationId: row.reservationId,
        metadata: { attempt: row.sentCount + 1 },
      })
      .catch((err: any) =>
        this.logger.error(`[BOT ANALYTICS] trackFollowUpSent failed: ${err?.message}`),
      );

    // 6. Advance state
    const newSentCount = row.sentCount + 1;
    const isDone = newSentCount >= row.maxAttempts;

    await this.prisma.botCheckoutFollowUp.update({
      where: { id: row.id },
      data: {
        sentCount: newSentCount,
        lastSentAt: now,
        status: isDone ? FollowUpStatus.CANCELLED : FollowUpStatus.PENDING,
        nextSendAt: isDone
          ? now
          : new Date(now.getTime() + 6 * 60 * 60 * 1000),
      },
    });
  }
}
