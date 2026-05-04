import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PaymentProvider,
  PaymentRecordStatus,
  PaymentStatus,
  ReservationStatus,
} from '@prisma/client';
import Stripe from 'stripe';
import { EmailService } from '../../core/email/email.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    const secretKey =
      this.configService.get<string>('STRIPE_SECRET_KEY') || '';

    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        hotel: true,
        guest: true,
        roomType: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Reservation is already paid');
    }

    const webAppUrl = this.configService.get<string>('WEB_APP_URL');
    if (!webAppUrl) {
      throw new Error(
        'WEB_APP_URL is not set. Cannot build Stripe redirect URLs. Set this environment variable in Railway before processing payments.',
      );
    }
    const currency =
      this.configService.get<string>('STRIPE_CURRENCY') ||
      reservation.hotel.currency ||
      'mxn';

    const sessionMetadata = {
      reservationId: reservation.id,
      hotelId: reservation.hotelId,
      guestId: reservation.guestId,
    };

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const DESCRIPTOR_SUFFIX = 'RESERVA';

    if (isProd) {
      this.logger.log(
        `[StripeFlow] statement_descriptor_suffix="${DESCRIPTOR_SUFFIX}" — bank statement will show account prefix + "* ${DESCRIPTOR_SUFFIX}"`,
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: reservation.id,
      success_url: `${webAppUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webAppUrl}/booking/cancel?reservation_id=${reservation.id}`,
      customer_email: reservation.guest.email || undefined,
      metadata: sessionMetadata,
      ...(isProd && {
        payment_intent_data: {
          statement_descriptor_suffix: DESCRIPTOR_SUFFIX,
        },
      }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: Math.round(Number(reservation.totalAmount) * 100),
            product_data: {
              name: `${reservation.hotel.name} — ${reservation.roomType.name}`,
              description: `Reservation ${reservation.reservationCode}`,
            },
          },
        },
      ],
    });

    const paymentRow = await this.prisma.payment.create({
      data: {
        hotelId: reservation.hotelId,
        reservationId: reservation.id,
        provider: 'STRIPE',
        providerSessionId: session.id,
        amount: reservation.totalAmount,
        currency: currency.toUpperCase(),
        status: PaymentRecordStatus.PENDING,
        metadata: {
          checkoutSessionId: session.id,
          checkoutUrl: session.url,
        },
      },
    });

    this.logger.log(
      `[StripeFlow] checkout.session created session.id=${session.id} (this is Checkout Session id, not payment_intent) client_reference_id=${session.client_reference_id} metadata=${JSON.stringify(sessionMetadata)}`,
    );
    this.logger.log(
      `[StripeFlow] Payment row created payment.id=${paymentRow.id} reservationId=${paymentRow.reservationId} providerSessionId=${paymentRow.providerSessionId} metadata.checkoutSessionId=${session.id} (must match webhook session.id)`,
    );

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async handleStripeWebhook(rawBody: Buffer, signature?: string) {
    const webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    this.logger.log(
      `[StripeWebhook] Incoming webhook rawBody bytes=${rawBody?.length ?? 0} stripe-signature header present`,
    );

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    this.logger.log(
      `[StripeWebhook] Verified event type=${event.type} stripeEventId=${event.id}`,
    );

    if (event.type !== 'checkout.session.completed') {
      this.logger.log(
        `[StripeWebhook] No reservation update for event type=${event.type} (handler only processes checkout.session.completed)`,
      );
      return { received: true };
    }

    {
      const session = event.data.object as Stripe.Checkout.Session;
      const metaReservationId = session.metadata?.reservationId ?? undefined;

      const paymentIntentForLog =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent &&
              typeof session.payment_intent === 'object' &&
              'id' in session.payment_intent
            ? (session.payment_intent as { id: string }).id
            : session.payment_intent === null
              ? 'null'
              : typeof session.payment_intent;

      this.logger.log(
        `[StripeWebhook] checkout.session.completed for session.id=${session.id}`,
      );
      this.logger.log(
        `[StripeWebhook] session.payment_status=${session.payment_status} session.client_reference_id=${session.client_reference_id ?? 'undefined'}`,
      );
      this.logger.log(
        `[StripeWebhook] session.metadata=${JSON.stringify(session.metadata ?? {})}`,
      );
      this.logger.log(
        `[StripeWebhook] Metadata reservationId = ${metaReservationId ?? '(missing)'}`,
      );
      this.logger.log(
        `[StripeWebhook] session.payment_intent (for linkage) = ${paymentIntentForLog} — note: webhook matches Payment by session.id (cs_), not by payment_intent id (pi_)`,
      );

      if (session.payment_status !== 'paid') {
        this.logger.warn(
          `[StripeWebhook] Skipping update because payment_status is "${session.payment_status}" (expected "paid") for session ${session.id}`,
        );
        return { received: true };
      }

      let payment = await this.prisma.payment.findFirst({
        where: { providerSessionId: session.id },
        include: { reservation: true },
      });

      this.logger.log(
        `[StripeWebhook] Lookup Payment by providerSessionId===session.id (${session.id}): Found payment row? ${payment ? 'yes' : 'no'}${payment ? ` payment.id=${payment.id} db.providerSessionId=${payment.providerSessionId}` : ''}`,
      );

      if (!payment && metaReservationId) {
        const candidates = await this.prisma.payment.findMany({
          where: {
            reservationId: metaReservationId,
            provider: PaymentProvider.STRIPE,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { reservation: true },
        });
        this.logger.log(
          `[StripeWebhook] Fallback: loaded ${candidates.length} STRIPE Payment row(s) for reservationId=${metaReservationId}; searching metadata.checkoutSessionId===${session.id}`,
        );
        payment =
          candidates.find((p) => {
            const m = p.metadata as Record<string, unknown> | null;
            return m?.checkoutSessionId === session.id;
          }) ?? null;
        this.logger.log(
          `[StripeWebhook] Fallback match by metadata.checkoutSessionId: Found payment row? ${payment ? 'yes' : 'no'}${payment ? ` payment.id=${payment.id}` : ''}`,
        );
      }

      if (
        payment &&
        metaReservationId &&
        payment.reservationId !== metaReservationId
      ) {
        this.logger.warn(
          `Stripe session ${session.id}: metadata reservationId ${metaReservationId} does not match payment.reservationId ${payment.reservationId}; using payment row`,
        );
      }

      const reservationId =
        payment?.reservationId ?? metaReservationId ?? undefined;

      const reservationRow = reservationId
        ? await this.prisma.reservation.findUnique({
            where: { id: reservationId },
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              reservationCode: true,
            },
          })
        : null;

      this.logger.log(
        `[StripeWebhook] Target reservationId=${reservationId ?? '(none)'} — Found reservation row? ${reservationRow ? 'yes' : 'no'}${reservationRow ? ` status=${reservationRow.status} paymentStatus=${reservationRow.paymentStatus} code=${reservationRow.reservationCode}` : ''}`,
      );

      if (!reservationId) {
        this.logger.error(
          `[StripeWebhook] Cannot update: no payment row for session ${session.id} and no reservationId in session.metadata (metadata=${JSON.stringify(session.metadata ?? {})})`,
        );
        return { received: true };
      }

      let paidAmount =
        typeof session.amount_total === 'number'
          ? session.amount_total / 100
          : payment
            ? Number(payment.amount)
            : 0;
      if (paidAmount === 0 && reservationId) {
        const r = await this.prisma.reservation.findUnique({
          where: { id: reservationId },
          select: { totalAmount: true },
        });
        if (r) paidAmount = Number(r.totalAmount);
      }

      const paymentIntent = session.payment_intent;
      const providerPaymentId =
        typeof paymentIntent === 'string'
          ? paymentIntent
          : paymentIntent &&
              typeof paymentIntent === 'object' &&
              'id' in paymentIntent
            ? String((paymentIntent as { id: string }).id)
            : undefined;

      if (!payment) {
        this.logger.warn(
          `[StripeWebhook] No Payment row to mark SUCCEEDED (will still try reservation update if reservationId is known). providerPaymentId from session would be ${providerPaymentId ?? '(none)'}`,
        );
      }

      if (payment) {
        const prevMeta =
          typeof payment.metadata === 'object' && payment.metadata
            ? (payment.metadata as Record<string, unknown>)
            : {};
        const paymentUpdate = await this.prisma.payment.updateMany({
          where: {
            id: payment.id,
            status: { not: PaymentRecordStatus.SUCCEEDED },
          },
          data: {
            status: PaymentRecordStatus.SUCCEEDED,
            providerSessionId: session.id,
            providerPaymentId,
            paidAt: new Date(),
            metadata: {
              ...prevMeta,
              checkoutSessionId: session.id,
              amountTotal: session.amount_total,
              currency: session.currency,
              paymentStatus: session.payment_status,
            },
          },
        });
        this.logger.log(
          `[StripeWebhook] Payment updateMany matched=${paymentUpdate.count} row(s) for payment.id=${payment.id} (0 = already SUCCEEDED / idempotent)`,
        );
      }

      this.logger.log(
        `[StripeWebhook] Attempting Reservation updateMany id=${reservationId} where not (PAID + CONFIRMED); paidAmount=${paidAmount}`,
      );

      const reservationUpdate = await this.prisma.reservation.updateMany({
        where: {
          id: reservationId,
          OR: [
            { paymentStatus: { not: PaymentStatus.PAID } },
            { status: { not: ReservationStatus.CONFIRMED } },
          ],
        },
        data: {
          amountPaid: paidAmount,
          paymentStatus: PaymentStatus.PAID,
          status: ReservationStatus.CONFIRMED,
        },
      });

      if (reservationUpdate.count > 0) {
        this.logger.log(
          `[StripeWebhook] Updated reservation ${reservationId} to CONFIRMED / PAID (session ${session.id}, rows=${reservationUpdate.count})`,
        );

        const updatedReservation = await this.prisma.reservation.findUnique({
          where: { id: reservationId },
          include: {
            guest: true,
            roomType: true,
            hotel: true,
          },
        });

        if (updatedReservation) {
          try {
            await this.emailService.sendPaymentConfirmedEmail({
              to: updatedReservation.guest.email || '',
              guestName: `${updatedReservation.guest.firstName} ${updatedReservation.guest.lastName}`,
              reservationCode: updatedReservation.reservationCode,
              hotelName: updatedReservation.hotel.name,
              roomTypeName: updatedReservation.roomType.name,
              checkInDate: updatedReservation.checkInDate
                .toISOString()
                .slice(0, 10),
              checkOutDate: updatedReservation.checkOutDate
                .toISOString()
                .slice(0, 10),
              totalAmount: updatedReservation.totalAmount.toString(),
              currency: updatedReservation.hotel.currency,
            });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `Payment confirmation email failed for reservation ${reservationId}: ${message}`,
            );
          }
        }
      } else {
        const fresh = await this.prisma.reservation.findUnique({
          where: { id: reservationId },
          select: { id: true, status: true, paymentStatus: true },
        });
        if (!fresh) {
          this.logger.warn(
            `[StripeWebhook] Skipping update: reservation updateMany matched 0 and Reservation not found for id=${reservationId} (metadata/DB mismatch or wrong API database)`,
          );
        } else if (
          fresh.paymentStatus === PaymentStatus.PAID &&
          fresh.status === ReservationStatus.CONFIRMED
        ) {
          this.logger.log(
            `[StripeWebhook] Skipping reservation update: already CONFIRMED/PAID (idempotent) reservation ${reservationId} session ${session.id}`,
          );
        } else {
          this.logger.warn(
            `[StripeWebhook] Unexpected: reservation updateMany matched 0 but row exists id=${reservationId} status=${fresh.status} paymentStatus=${fresh.paymentStatus} — investigate Prisma where clause or concurrent writes`,
          );
        }
      }
    }

    return { received: true };
  }
}