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
  private readonly logoUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY') || '';
    this.from =
      this.configService.get<string>('EMAIL_FROM') ||
      'HotelOS <onboarding@resend.dev>';

    const webAppUrl = this.configService.get<string>('WEB_APP_URL') ?? '';
    this.logoUrl = webAppUrl
      ? `${webAppUrl.replace(/\/$/, '')}/apple-touch-icon.png`
      : '';

    this.resend = apiKey ? new Resend(apiKey) : null;

    this.logger.log(`EmailService initialized. From: ${this.from}`);
    this.logger.log(`Resend configured: ${apiKey ? 'YES' : 'NO'}`);
    this.logger.log(`Logo URL: ${this.logoUrl || '(none — WEB_APP_URL not set)'}`);
  }

  async sendReservationCreatedEmail(params: {
    to: string;
    guestName: string;
    reservationCode: string;
    hotelName: string;
    roomTypeName: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    adults: number;
    children: number;
    totalAmount: string | number;
    currency: string;
    checkoutUrl?: string;
  }) {
    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY not configured. Skipping reservation-created email to ${params.to}`,
      );
      return;
    }

    const guestName       = esc(params.guestName);
    const reservationCode = esc(params.reservationCode);
    const cabinName       = esc(params.roomTypeName);
    const checkInFmt      = formatDateEs(params.checkInDate);
    const checkOutFmt     = formatDateEs(params.checkOutDate);
    const amountFmt       = formatAmountMxn(params.totalAmount, params.currency);
    const guestsLine      = params.children > 0
      ? `${params.adults} adultos, ${params.children} menores`
      : `${params.adults} adultos`;

    const subject = `Reserva recibida · Los Vagones`;

    const logoSection = this.logoUrl
      ? `<img src="${this.logoUrl}" alt="Los Vagones" width="150" height="150"
             style="display:block;margin:0 auto;border:0;width:150px;height:150px;" />`
      : `<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;
                   letter-spacing:8px;color:#f0e8dc;text-transform:uppercase;
                   font-weight:normal;">Los Vagones</p>`;

    const checkoutBlock = params.checkoutUrl
      ? `
        <tr>
          <td style="background-color:#1a1d21;padding:0 48px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center">
                  <a href="${esc(params.checkoutUrl)}"
                     style="display:inline-block;background-color:#9b6840;color:#ffffff;
                            font-family:Arial,Helvetica,sans-serif;font-size:12px;
                            font-weight:bold;letter-spacing:3px;text-decoration:none;
                            text-align:center;padding:16px 36px;border-radius:4px;
                            text-transform:uppercase;">
                    Completar pago ahora &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#111315;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111315;">
  <tr>
    <td align="center" style="padding:36px 16px 48px;">

      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:640px;background-color:#1a1d21;border-radius:8px;
                    overflow:hidden;border:1px solid rgba(255,255,255,0.07);">

        <!-- Logo -->
        <tr>
          <td style="background-color:#1a1d21;padding:44px 48px 32px;text-align:center;">
            ${logoSection}
          </td>
        </tr>

        <!-- Status bar -->
        <tr>
          <td style="background-color:#2e1f0a;padding:13px 48px;text-align:center;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                      letter-spacing:4px;color:#c8956a;text-transform:uppercase;">
              &#9679;&nbsp;&nbsp;Reserva recibida &mdash; Pago pendiente
            </p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="background-color:#1a1d21;padding:44px 48px 0;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                      color:#4a4a52;text-transform:uppercase;letter-spacing:3px;">
              Hola,
            </p>
            <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;
                       font-size:36px;color:#f0e8dc;font-weight:normal;line-height:1.15;">
              ${guestName}
            </h1>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                      line-height:1.85;color:#8a8680;">
              Recibimos tu solicitud de reserva. Para confirmar tu estancia,
              completa el pago con los datos que se muestran a continuaci&oacute;n.
            </p>
          </td>
        </tr>

        <!-- Details card -->
        <tr>
          <td style="background-color:#1a1d21;padding:32px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background-color:#141618;border:1px solid rgba(255,255,255,0.06);
                          border-radius:6px;">
              <tr>
                <td style="padding:20px 24px 0;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;
                            letter-spacing:3px;color:#484850;text-transform:uppercase;">
                    Detalles de tu reserva
                  </p>
                </td>
              </tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">C&oacute;digo de reserva</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#f0e8dc;letter-spacing:1px;">${reservationCode}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Caba&ntilde;a</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#cdc5bb;">${cabinName}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Check-in</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#cdc5bb;">${checkInFmt}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Check-out</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#cdc5bb;">${checkOutFmt}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Noches</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#cdc5bb;">${params.nights}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Hu&eacute;spedes</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#cdc5bb;">${guestsLine}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Total</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#f0e8dc;">${amountFmt}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Estado de pago</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#c8956a;">Pendiente</td>
                </tr></table>
              </td></tr>

            </table>
          </td>
        </tr>

        ${checkoutBlock}

        <!-- Info box -->
        <tr>
          <td style="background-color:#1a1d21;padding:0 48px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background-color:#f2e8d8;border-radius:6px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                            line-height:1.75;color:#3a2e24;">
                    <strong>Llegada:</strong> a partir de las 15:00 hrs
                    &nbsp;&bull;&nbsp;
                    <strong>Salida:</strong> antes de las 11:00 hrs
                  </p>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                            line-height:1.75;color:#3a2e24;">
                    &iquest;Preguntas? Escr&iacute;benos a
                    <a href="mailto:losvagonesmex@gmail.com"
                       style="color:#7a4e28;text-decoration:none;font-weight:bold;">losvagonesmex@gmail.com</a>
                    &nbsp;&bull;&nbsp; +52&nbsp;55&nbsp;8284&nbsp;3604
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#141618;padding:32px 48px;text-align:center;">
            <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;
                      font-size:15px;color:#4a4850;font-style:italic;">
              Gracias por elegir Los Vagones.
            </p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;
                      letter-spacing:2px;color:#383840;text-transform:uppercase;">
              La Marquesa &nbsp;&bull;&nbsp; Estado de M&eacute;xico
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>`;

    const checkoutTextBlock = params.checkoutUrl
      ? `\nCOMPLETA TU PAGO\n----------------\n${params.checkoutUrl}\n`
      : '';

    const text = `Reserva recibida · Los Vagones

Hola ${params.guestName},

Recibimos tu solicitud de reserva. Para confirmar tu estancia,
completa el pago con los datos que se muestran a continuación.

DETALLES DE TU RESERVA
-----------------------
Código de reserva : ${params.reservationCode}
Cabaña            : ${params.roomTypeName}
Check-in          : ${checkInFmt}
Check-out         : ${checkOutFmt}
Noches            : ${params.nights}
Huéspedes         : ${guestsLine}
Total             : ${amountFmt}
Estado de pago    : Pendiente
${checkoutTextBlock}
INFORMACIÓN ÚTIL
----------------
Llegada  : a partir de las 15:00 hrs
Salida   : antes de las 11:00 hrs
Contacto : losvagonesmex@gmail.com · +52 55 8284 3604

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
        `Reservation-created email sent to ${params.to}: ${JSON.stringify(result)}`,
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

    const logoSection = this.logoUrl
      ? `<img src="${this.logoUrl}" alt="Los Vagones" width="150" height="150"
             style="display:block;margin:0 auto;border:0;width:150px;height:150px;" />`
      : `<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;
                   letter-spacing:8px;color:#f0e8dc;text-transform:uppercase;
                   font-weight:normal;">Los Vagones</p>`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#111315;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111315;">
  <tr>
    <td align="center" style="padding:36px 16px 48px;">

      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:640px;background-color:#1a1d21;border-radius:8px;
                    overflow:hidden;border:1px solid rgba(255,255,255,0.07);">

        <!-- Logo -->
        <tr>
          <td style="background-color:#1a1d21;padding:44px 48px 32px;text-align:center;">
            ${logoSection}
          </td>
        </tr>

        <!-- Status bar -->
        <tr>
          <td style="background-color:#0f2018;padding:13px 48px;text-align:center;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                      letter-spacing:4px;color:#6aab6a;text-transform:uppercase;">
              &#10003;&nbsp;&nbsp;Pago confirmado
            </p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="background-color:#1a1d21;padding:44px 48px 0;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                      color:#4a4a52;text-transform:uppercase;letter-spacing:3px;">
              Hola,
            </p>
            <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;
                       font-size:36px;color:#f0e8dc;font-weight:normal;line-height:1.15;">
              ${guestName}
            </h1>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                      line-height:1.85;color:#8a8680;">
              Tu pago fue recibido correctamente y tu reserva ha quedado confirmada.
              Te esperamos para disfrutar una estancia &uacute;nica en La Marquesa.
            </p>
          </td>
        </tr>

        <!-- Details card -->
        <tr>
          <td style="background-color:#1a1d21;padding:32px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background-color:#141618;border:1px solid rgba(255,255,255,0.06);
                          border-radius:6px;">
              <tr>
                <td style="padding:20px 24px 0;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;
                            letter-spacing:3px;color:#484850;text-transform:uppercase;">
                    Detalles de tu reserva
                  </p>
                </td>
              </tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">C&oacute;digo de reserva</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#f0e8dc;letter-spacing:1px;">${reservationCode}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Caba&ntilde;a</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#cdc5bb;">${cabinName}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Check-in</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#cdc5bb;">${checkInFmt}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Check-out</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#cdc5bb;">${checkOutFmt}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>

              <tr><td style="padding:16px 24px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#585858;">Total pagado</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#f0e8dc;">${amountFmt}</td>
                </tr></table>
              </td></tr>

            </table>
          </td>
        </tr>

        <!-- Action buttons -->
        <tr>
          <td style="background-color:#1a1d21;padding:0 48px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
              <tr>
                <td align="center">
                  <a href="${calendarUrl}"
                     style="display:inline-block;background-color:#9b6840;color:#ffffff;
                            font-family:Arial,Helvetica,sans-serif;font-size:12px;
                            font-weight:bold;letter-spacing:3px;text-decoration:none;
                            text-align:center;padding:16px 32px;border-radius:4px;
                            text-transform:uppercase;">
                    + Agregar al calendario
                  </a>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="49%" style="padding-right:6px;">
                  <a href="${GOOGLE_MAPS_URL}"
                     style="display:block;background-color:#252830;color:#c0b8b0;
                            font-family:Arial,Helvetica,sans-serif;font-size:11px;
                            letter-spacing:2px;text-decoration:none;text-align:center;
                            padding:14px 16px;border-radius:4px;text-transform:uppercase;
                            border:1px solid rgba(255,255,255,0.08);">
                    Google Maps
                  </a>
                </td>
                <td width="2%"></td>
                <td width="49%" style="padding-left:6px;">
                  <a href="${WAZE_URL}"
                     style="display:block;background-color:#252830;color:#c0b8b0;
                            font-family:Arial,Helvetica,sans-serif;font-size:11px;
                            letter-spacing:2px;text-decoration:none;text-align:center;
                            padding:14px 16px;border-radius:4px;text-transform:uppercase;
                            border:1px solid rgba(255,255,255,0.08);">
                    Waze
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Info box -->
        <tr>
          <td style="background-color:#1a1d21;padding:0 48px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background-color:#f2e8d8;border-radius:6px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                            line-height:1.75;color:#3a2e24;">
                    <strong>Llegada:</strong> a partir de las 15:00 hrs
                    &nbsp;&bull;&nbsp;
                    <strong>Salida:</strong> antes de las 11:00 hrs
                  </p>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                            line-height:1.75;color:#3a2e24;">
                    Ten a la mano tu c&oacute;digo <strong>${reservationCode}</strong>.
                    &iquest;Preguntas?
                    <a href="mailto:losvagonesmex@gmail.com"
                       style="color:#7a4e28;text-decoration:none;font-weight:bold;">losvagonesmex@gmail.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#141618;padding:32px 48px;text-align:center;">
            <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;
                      font-size:15px;color:#4a4850;font-style:italic;">
              Gracias por elegir Los Vagones.
            </p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;
                      letter-spacing:2px;color:#383840;text-transform:uppercase;">
              La Marquesa &nbsp;&bull;&nbsp; Estado de M&eacute;xico
            </p>
          </td>
        </tr>

      </table>

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

  async sendAdminReservationConfirmedEmail(params: {
    guestName: string;
    guestEmail: string;
    guestPhone?: string | null;
    reservationCode: string;
    reservationId: string;
    roomTypeName: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    adults: number;
    children: number;
    totalAmount: string | number;
    currency: string;
  }) {
    const adminEmail = this.configService.get<string>('ADMIN_NOTIFICATION_EMAIL');
    if (!adminEmail) {
      this.logger.warn(
        'ADMIN_NOTIFICATION_EMAIL not set — skipping admin notification for reservation ' +
          params.reservationCode,
      );
      return;
    }

    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY not configured. Skipping admin notification for ${params.reservationCode}`,
      );
      return;
    }

    const adminAppUrl =
      this.configService.get<string>('ADMIN_APP_URL') || 'https://admin.losvagones.mx';

    const guestName       = esc(params.guestName);
    const guestEmail      = esc(params.guestEmail);
    const cabinName       = esc(params.roomTypeName);
    const reservationCode = esc(params.reservationCode);
    const checkInFmt      = formatDateEs(params.checkInDate);
    const checkOutFmt     = formatDateEs(params.checkOutDate);
    const amountFmt       = formatAmountMxn(params.totalAmount, params.currency);
    const detailUrl       = `${adminAppUrl}/reservations/${params.reservationId}`;
    const guestsLine      = params.children > 0
      ? `${params.adults} adultos, ${params.children} menores`
      : `${params.adults} adultos`;

    const subject = `Nueva reserva confirmada — Los Vagones`;

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

      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:580px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a1a;padding:36px 48px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:24px;letter-spacing:8px;
                      color:#ffffff;text-transform:uppercase;font-weight:normal;">
              Los Vagones
            </p>
            <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                      letter-spacing:3px;color:#888888;text-transform:uppercase;">
              Panel de Administraci&oacute;n
            </p>
          </td>
        </tr>

        <!-- Status bar -->
        <tr>
          <td style="background-color:#2a5025;padding:13px 48px;text-align:center;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                      letter-spacing:3px;color:#8ecb82;text-transform:uppercase;">
              &#10003;&nbsp; Nueva reserva confirmada
            </p>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:36px 48px 24px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                      line-height:1.8;color:#555555;">
              Se recibi&oacute; un pago y la siguiente reserva fue confirmada autom&aacute;ticamente.
            </p>
          </td>
        </tr>

        <!-- Guest details card -->
        <tr>
          <td style="padding:0 48px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:4px;">
              <tr>
                <td style="padding:18px 24px 0;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;
                            letter-spacing:3px;color:#999999;text-transform:uppercase;">
                    Hu&eacute;sped
                  </p>
                </td>
              </tr>
              <tr><td style="padding:12px 24px 0;"><div style="height:1px;background:#e8e3db;"></div></td></tr>

              <!-- Guest name -->
              <tr>
                <td style="padding:14px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">Nombre</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;font-weight:bold;">${guestName}</td>
                  </tr></table>
                </td>
              </tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:#e8e3db;"></div></td></tr>

              <!-- Guest email -->
              <tr>
                <td style="padding:14px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">Correo</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2c2c2c;">${guestEmail}</td>
                  </tr></table>
                </td>
              </tr>

              ${params.guestPhone ? `
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:#e8e3db;"></div></td></tr>
              <tr>
                <td style="padding:14px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">Tel&eacute;fono</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2c2c2c;">${esc(params.guestPhone)}</td>
                  </tr></table>
                </td>
              </tr>` : ''}

              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:#e8e3db;"></div></td></tr>
              <!-- Guests count -->
              <tr>
                <td style="padding:14px 24px 18px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">Hu&eacute;spedes</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2c2c2c;">${esc(guestsLine)}</td>
                  </tr></table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Reservation details card -->
        <tr>
          <td style="padding:0 48px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#f9f7f4;border:1px solid #e8e3db;border-radius:4px;">
              <tr>
                <td style="padding:18px 24px 0;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;
                            letter-spacing:3px;color:#999999;text-transform:uppercase;">
                    Reserva
                  </p>
                </td>
              </tr>
              <tr><td style="padding:12px 24px 0;"><div style="height:1px;background:#e8e3db;"></div></td></tr>

              <!-- Código -->
              <tr>
                <td style="padding:14px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">C&oacute;digo</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1a1a1a;letter-spacing:1px;">${reservationCode}</td>
                  </tr></table>
                </td>
              </tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:#e8e3db;"></div></td></tr>

              <!-- Cabaña -->
              <tr>
                <td style="padding:14px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">Caba&ntilde;a</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2c2c2c;">${cabinName}</td>
                  </tr></table>
                </td>
              </tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:#e8e3db;"></div></td></tr>

              <!-- Check-in -->
              <tr>
                <td style="padding:14px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">Check-in</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2c2c2c;">${checkInFmt}</td>
                  </tr></table>
                </td>
              </tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:#e8e3db;"></div></td></tr>

              <!-- Check-out -->
              <tr>
                <td style="padding:14px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">Check-out</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2c2c2c;">${checkOutFmt}</td>
                  </tr></table>
                </td>
              </tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:#e8e3db;"></div></td></tr>

              <!-- Noches -->
              <tr>
                <td style="padding:14px 24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">Noches</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2c2c2c;">${params.nights}</td>
                  </tr></table>
                </td>
              </tr>
              <tr><td style="padding:14px 24px 0;"><div style="height:1px;background:#e8e3db;"></div></td></tr>

              <!-- Total -->
              <tr>
                <td style="padding:14px 24px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;">Total pagado</td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#1a1a1a;">${amountFmt}</td>
                  </tr></table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 48px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center">
                  <a href="${detailUrl}"
                     style="display:inline-block;background-color:#9b5c2a;color:#ffffff;
                            font-family:Arial,Helvetica,sans-serif;font-size:13px;
                            font-weight:bold;letter-spacing:2px;text-decoration:none;
                            text-align:center;padding:15px 32px;border-radius:3px;
                            text-transform:uppercase;">
                    Ver reserva en el panel
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#1a1a1a;padding:28px 48px;text-align:center;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                      letter-spacing:2px;color:#666666;text-transform:uppercase;">
              Los Vagones &nbsp;&bull;&nbsp; Notificaci&oacute;n interna
            </p>
            <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#444444;">
              Este mensaje es solo para el equipo operador. No reenviar al hu&eacute;sped.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    const text = `Nueva reserva confirmada — Los Vagones
PANEL DE ADMINISTRACIÓN

HUÉSPED
-------
Nombre    : ${params.guestName}
Correo    : ${params.guestEmail}${params.guestPhone ? `\nTeléfono  : ${params.guestPhone}` : ''}
Huéspedes : ${guestsLine}

RESERVA
-------
Código    : ${params.reservationCode}
Cabaña    : ${params.roomTypeName}
Check-in  : ${checkInFmt}
Check-out : ${checkOutFmt}
Noches    : ${params.nights}
Total     : ${amountFmt}

Ver en el panel: ${detailUrl}

—
Los Vagones · Notificación interna`;

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: adminEmail,
        subject,
        html,
        text,
      });

      this.logger.log(
        `Admin notification email sent to ${adminEmail} for reservation ${params.reservationCode}: ${JSON.stringify(result)}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send admin notification email for reservation ${params.reservationCode}: ${error?.message || error}`,
        error?.stack,
      );
    }
  }
}
