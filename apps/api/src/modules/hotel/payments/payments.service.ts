import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentRecordStatus, PaymentStatus, ReservationStatus } from '@prisma/client';
import Stripe from 'stripe';
import { EmailService } from '../../core/email/email.service';

@Injectable()
export class PaymentsService {
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

    const webAppUrl =
      this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
    const currency =
      this.configService.get<string>('STRIPE_CURRENCY') ||
      reservation.hotel.currency ||
      'mxn';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: reservation.id,
      success_url: `${webAppUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webAppUrl}/booking/cancel?reservation_id=${reservation.id}`,
      customer_email: reservation.guest.email || undefined,
      metadata: {
        reservationId: reservation.id,
        hotelId: reservation.hotelId,
        guestId: reservation.guestId,
      },
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

    await this.prisma.payment.create({
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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const payment = await this.prisma.payment.findFirst({
        where: {
          providerSessionId: session.id,
        },
        include: {
          reservation: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment record not found');
      }

      const paidAmount =
        typeof session.amount_total === 'number'
          ? session.amount_total / 100
          : Number(payment.amount);

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentRecordStatus.SUCCEEDED,
          providerPaymentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : undefined,
          paidAt: new Date(),
          metadata: {
            ...(typeof payment.metadata === 'object' && payment.metadata
              ? payment.metadata
              : {}),
            checkoutSessionId: session.id,
            amountTotal: session.amount_total,
            currency: session.currency,
            paymentStatus: session.payment_status,
          },
        },
      });

            const updatedReservation = await this.prisma.reservation.update({
        where: { id: payment.reservationId },
        data: {
          amountPaid: paidAmount,
          paymentStatus: PaymentStatus.PAID,
          status: ReservationStatus.CONFIRMED,
        },
        include: {
          guest: true,
          roomType: true,
          hotel: true,
        },
      });

      await this.emailService.sendPaymentConfirmedEmail({
        to: updatedReservation.guest.email || '',
        guestName: `${updatedReservation.guest.firstName} ${updatedReservation.guest.lastName}`,
        reservationCode: updatedReservation.reservationCode,
        hotelName: updatedReservation.hotel.name,
        roomTypeName: updatedReservation.roomType.name,
        checkInDate: updatedReservation.checkInDate.toISOString().slice(0, 10),
        checkOutDate: updatedReservation.checkOutDate.toISOString().slice(0, 10),
        totalAmount: updatedReservation.totalAmount.toString(),
        currency: updatedReservation.hotel.currency,
      });
    }

    return { received: true };
  }
}