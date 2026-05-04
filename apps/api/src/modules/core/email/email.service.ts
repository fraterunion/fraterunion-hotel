import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

// ── Los Vagones location constants ─────────────────────────────────────────────
// Exact GPS coordinates are not in config. Using named query fallback until
// verified coordinates are added. Replace with lat/lng constants when confirmed.
const LOS_VAGONES_MAPS_QUERY = 'Los+Vagones+La+Marquesa+Estado+de+Mexico';
const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${LOS_VAGONES_MAPS_QUERY}`;
const WAZE_URL = `https://waze.com/ul?q=${LOS_VAGONES_MAPS_QUERY}&navigate=yes`;

// ── Helpers ────────────────────────────────────────────────────────────────────

const ES_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDateEs(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  return `${day} de ${ES_MONTHS[month - 1]} de ${year}`;
}

function formatAmountMxn(amount: string | number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${currency.toUpperCase()} ${Number(amount).toLocaleString('es-MX')}`;
  }
}

function toGCalDate(ymd: string): string {
  return ymd.replace(/-/g, '');
}

function buildGoogleCalendarUrl(
  cabinName: string,
  checkInDate: string,
  checkOutDate: string,
  reservationCode: string,
): string {
  const text = `Estancia en Los Vagones - ${cabinName}`;
  const dates = `${toGCalDate(checkInDate)}/${toGCalDate(checkOutDate)}`;
  const location = 'Los Vagones, La Marquesa, Estado de México';
  const details = `Código de reserva: ${reservationCode} | Cabaña: ${cabinName} | Check-in: ${checkInDate} | Check-out: ${checkOutDate}`;
  const qs = new URLSearchParams({ action: 'TEMPLATE', text, dates, details, location });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Service ────────────────────────────────────────────────────────────────────

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

    const guestName       = esc(params.guestName);
    const reservationCode = esc(params.reservationCode);
    const cabinName       = esc(params.roomTypeName);
    const checkInFmt      = formatDateEs(params.checkInDate);
    const checkOutFmt     = formatDateEs(params.checkOutDate);
    const amountFmt       = formatAmountMxn(params.totalAmount, params.currency);
    const calendarUrl     = buildGoogleCalendarUrl(
      params.roomTypeName,
      params.checkInDate,
      params.checkOutDate,
      params.reservationCode,
    );

    const subject = `Pago confirmado — Los Vagones`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1ec;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f1ec;">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <!-- Card wrapper -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:580px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- ── Header ── -->
        <tr>
          <td style="background-color:#1a1a1a;padding:36px 48px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:24px;letter-spacing:8px;
                      color:#ffffff;text-transform:uppercase;font-weight:normal;">
              Los Vagones
            </p>
            <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                      letter-spacing:3px;color:#888888;text-transform:uppercase;">
              La Marquesa &nbsp;&bull;&nbsp; Estado de M&eacute;xico
            </p>
          </td>
        </tr>

        <!-- ── Confirmation bar ── -->
        <tr>
          <td style="background-color:#2a5025;padding:13px 48px;text-align:center;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                      letter-spacing:3px;color:#8ecb82;text-transform:uppercase;">
              &#10003;&nbsp; Pago confirmado
            </p>
          </td>
        </tr>

        <!-- ── Greeting ── -->
        <tr>
          <td style="padding:40px 48px 0;">
            <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                      color:#999999;text-transform:uppercase;letter-spacing:2px;">
              Hola,
            </p>
            <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:30px;
                       color:#1a1a1a;font-weight:normal;line-height:1.2;">
              ${guestName}
            </h1>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                      line-height:1.8;color:#555555;">
              Tu pago fue recibido correctamente y tu reserva ha quedado confirmada.
              Te esperamos para disfrutar una estancia &uacute;nica en La Marquesa.
            </p>
          </td>
        </tr>

        <!-- ── Reservation details card ── -->
        <tr>
          <td style="padding:32px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:4px;">

              <!-- Card title -->
              <tr>
                <td style="padding:20px 24px 0;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;
                            letter-spacing:3px;color:#999999;text-transform:uppercase;">
                    Detalles de tu reserva
                  </p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:14px 24px 0;">
                <div style="height:1px;background:#e8e3db;"></div>
              </td></tr>

              <!-- Código de reserva -->
              <tr>
                <td style="padding:16px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">
                        C&oacute;digo de reserva
                      </td>
                      <td align="right"
                          style="font-family:Arial,Helvetica,sans-serif;font-size:13px;
                                 font-weight:bold;color:#1a1a1a;letter-spacing:1px;">
                        ${reservationCode}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:16px 24px 0;">
                <div style="height:1px;background:#e8e3db;"></div>
              </td></tr>

              <!-- Cabaña -->
              <tr>
                <td style="padding:16px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">
                        Caba&ntilde;a
                      </td>
                      <td align="right"
                          style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2c2c2c;">
                        ${cabinName}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:16px 24px 0;">
                <div style="height:1px;background:#e8e3db;"></div>
              </td></tr>

              <!-- Check-in -->
              <tr>
                <td style="padding:16px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">
                        Check-in
                      </td>
                      <td align="right"
                          style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2c2c2c;">
                        ${checkInFmt}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:16px 24px 0;">
                <div style="height:1px;background:#e8e3db;"></div>
              </td></tr>

              <!-- Check-out -->
              <tr>
                <td style="padding:16px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">
                        Check-out
                      </td>
                      <td align="right"
                          style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2c2c2c;">
                        ${checkOutFmt}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:16px 24px 0;">
                <div style="height:1px;background:#e8e3db;"></div>
              </td></tr>

              <!-- Total pagado -->
              <tr>
                <td style="padding:16px 24px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">
                        Total pagado
                      </td>
                      <td align="right"
                          style="font-family:Arial,Helvetica,sans-serif;font-size:18px;
                                 font-weight:bold;color:#1a1a1a;">
                        ${amountFmt}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- ── Action buttons ── -->
        <tr>
          <td style="padding:0 48px 32px;">

            <!-- Calendar button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="margin-bottom:12px;">
              <tr>
                <td align="center">
                  <a href="${calendarUrl}"
                     style="display:block;background-color:#9b5c2a;color:#ffffff;
                            font-family:Arial,Helvetica,sans-serif;font-size:13px;
                            font-weight:bold;letter-spacing:2px;text-decoration:none;
                            text-align:center;padding:15px 24px;border-radius:3px;
                            text-transform:uppercase;">
                    + Agregar al calendario
                  </a>
                </td>
              </tr>
            </table>

            <!-- Maps row -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="49%" style="padding-right:6px;">
                  <a href="${GOOGLE_MAPS_URL}"
                     style="display:block;background-color:#2c2c2c;color:#ffffff;
                            font-family:Arial,Helvetica,sans-serif;font-size:12px;
                            letter-spacing:1px;text-decoration:none;text-align:center;
                            padding:13px 16px;border-radius:3px;">
                    Google Maps
                  </a>
                </td>
                <td width="2%"></td>
                <td width="49%" style="padding-left:6px;">
                  <a href="${WAZE_URL}"
                     style="display:block;background-color:#2c2c2c;color:#ffffff;
                            font-family:Arial,Helvetica,sans-serif;font-size:12px;
                            letter-spacing:1px;text-decoration:none;text-align:center;
                            padding:13px 16px;border-radius:3px;">
                    Waze
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ── Helpful note ── -->
        <tr>
          <td style="padding:0 48px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border-left:3px solid #9b5c2a;background:#fdf9f5;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                            line-height:1.7;color:#555555;">
                    Te recomendamos revisar tu ruta antes de salir y tener a la mano tu
                    c&oacute;digo de reserva
                    <strong style="color:#1a1a1a;">${reservationCode}</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Closing message ── -->
        <tr>
          <td style="padding:0 48px 48px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:16px;line-height:1.8;
                      color:#2c2c2c;font-style:italic;">
              Gracias por elegir Los Vagones.<br>
              Te esperamos para disfrutar una estancia &uacute;nica en La Marquesa.
            </p>
          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="background-color:#1a1a1a;padding:28px 48px;text-align:center;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                      letter-spacing:2px;color:#666666;text-transform:uppercase;">
              Los Vagones &nbsp;&bull;&nbsp; La Marquesa, Estado de M&eacute;xico
            </p>
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;
                      font-size:11px;color:#555555;">
              losvagonesmex@gmail.com &nbsp;&bull;&nbsp; +52 55 8284 3604
            </p>
            <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;
                      font-size:10px;color:#444444;">
              Este correo fue generado autom&aacute;ticamente. Por favor no respondas a este mensaje.
            </p>
          </td>
        </tr>

      </table>
      <!-- / Card wrapper -->

    </td>
  </tr>
</table>
</body>
</html>`;

    const text = `Pago confirmado — Los Vagones

Hola ${params.guestName},

Tu pago fue recibido correctamente y tu reserva ha quedado confirmada.

DETALLES DE TU RESERVA
-----------------------
Código de reserva : ${params.reservationCode}
Cabaña            : ${params.roomTypeName}
Check-in          : ${checkInFmt}
Check-out         : ${checkOutFmt}
Total pagado      : ${amountFmt}

CÓMO LLEGAR
-----------
Google Maps : ${GOOGLE_MAPS_URL}
Waze        : ${WAZE_URL}

AGREGAR AL CALENDARIO
---------------------
${calendarUrl}

Te recomendamos revisar tu ruta antes de salir y tener a la mano tu código de reserva ${params.reservationCode}.

Gracias por elegir Los Vagones. Te esperamos para disfrutar una estancia única en La Marquesa.

—
Los Vagones · La Marquesa, Estado de México
losvagonesmex@gmail.com · +52 55 8284 3604`;

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject,
        html,
        text,
      });

      this.logger.log(
        `Payment-confirmed email sent to ${params.to}: ${JSON.stringify(result)}`,
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
