import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY') || '';
    this.from =
      this.configService.get<string>('EMAIL_FROM') ||
      'HotelOS <onboarding@resend.dev>';

    this.resend = apiKey ? new Resend(apiKey) : null;

    this.logger.log(`EmailService initialized. From: ${this.from}`);
    this.logger.log(`Resend configured: ${apiKey ? 'YES' : 'NO'}`);
  }

  async sendReservationCreatedEmail(params: {
    to: string;
    guestName: string;
    reservationCode: string;
    hotelName: string;
    roomTypeName: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: string | number;
    currency: string;
  }) {
    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY not configured. Skipping reservation-created email to ${params.to}`,
      );
      return;
    }

    const subject = `Your reservation ${params.reservationCode} was created`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Reservation Created</h2>
        <p>Hello ${params.guestName},</p>
        <p>Your reservation has been created successfully and is currently pending payment confirmation.</p>
        <ul>
          <li><strong>Hotel:</strong> ${params.hotelName}</li>
          <li><strong>Reservation code:</strong> ${params.reservationCode}</li>
          <li><strong>Room type:</strong> ${params.roomTypeName}</li>
          <li><strong>Check-in:</strong> ${params.checkInDate}</li>
          <li><strong>Check-out:</strong> ${params.checkOutDate}</li>
          <li><strong>Total amount:</strong> ${params.currency} ${params.totalAmount}</li>
        </ul>
        <p>Thank you for choosing us.</p>
      </div>
    `;

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject,
        html,
      });

      this.logger.log(
        `Reservation-created email attempted for ${params.to}: ${JSON.stringify(result)}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send reservation-created email to ${params.to}: ${error?.message || error}`,
        error?.stack,
      );
      throw error;
    }
  }

  async sendPaymentConfirmedEmail(params: {
    to: string;
    guestName: string;
    reservationCode: string;
    hotelName: string;
    roomTypeName: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: string | number;
    currency: string;
  }) {
    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY not configured. Skipping payment-confirmed email to ${params.to}`,
      );
      return;
    }

    const subject = `Payment confirmed for reservation ${params.reservationCode}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Payment Confirmed</h2>
        <p>Hello ${params.guestName},</p>
        <p>Your payment was received successfully and your reservation is now confirmed.</p>
        <ul>
          <li><strong>Hotel:</strong> ${params.hotelName}</li>
          <li><strong>Reservation code:</strong> ${params.reservationCode}</li>
          <li><strong>Room type:</strong> ${params.roomTypeName}</li>
          <li><strong>Check-in:</strong> ${params.checkInDate}</li>
          <li><strong>Check-out:</strong> ${params.checkOutDate}</li>
          <li><strong>Total paid:</strong> ${params.currency} ${params.totalAmount}</li>
        </ul>
        <p>We look forward to hosting you.</p>
      </div>
    `;

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject,
        html,
      });

      this.logger.log(
        `Payment-confirmed email attempted for ${params.to}: ${JSON.stringify(result)}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send payment-confirmed email to ${params.to}: ${error?.message || error}`,
        error?.stack,
      );
      throw error;
    }
  }
}