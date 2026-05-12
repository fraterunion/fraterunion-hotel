import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { BotAvailabilityService } from './bot.availability';
import { BotFollowUpService } from './bot.follow-up.service';
import { BotAnalyticsService } from './bot.analytics.service';
import { BotKnowledgeService } from './knowledge/bot-knowledge.service';
import { PrismaService } from '../../prisma/prisma.service';

// ── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_RESPONSE =
  'Gracias por escribir a Los Vagones. En este momento estamos configurando nuestro asistente automático. Para reservar, visita https://losvagones.mx';

const BOOKING_URL = 'https://losvagones.mx/booking';
const BOT_HOTEL_SLUG = 'hotel-boutique-demo';

// ── Session memory ───────────────────────────────────────────────────────────

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

type BotCabin = {
  id: string;
  name: string;
  slug: string;
  priceFrom: number;
  capacityAdults?: number;
};

type BotCatalogItem = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  sizeM2?: number | null;
  bedType?: string | null;
  amenities: string[];
};

type BotQuote = {
  nights: number;
  pricePerNight: number;
  subtotal: number;
  tax: number;
  serviceFee: number;
  total: number;
  currency: string;
};

type BotSession = {
  sessionId?: string;          // unique per 30-min conversation window
  conversationTracked?: boolean;
  checkInDate?: string;        // ISO YYYY-MM-DD
  checkOutDate?: string;       // ISO YYYY-MM-DD
  rawDateText?: string;        // original text when ISO not extractable
  people?: number;
  availableCabins?: BotCabin[];
  catalogCache?: BotCatalogItem[];
  // Checkout flow
  selectedCabin?: BotCabin;
  checkoutStep?: 'people' | 'full_name' | 'email' | 'confirm';
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  reservationId?: string;
  checkoutUrl?: string;
  quote?: BotQuote;
  updatedAt: number;
};

const sessions = new Map<string, BotSession>();

function getSession(from: string): BotSession {
  const existing = sessions.get(from);
  if (!existing || Date.now() - existing.updatedAt > SESSION_TTL_MS) {
    const fresh: BotSession = {
      sessionId: randomUUID(),
      updatedAt: Date.now(),
    };
    sessions.set(from, fresh);
    return fresh;
  }
  return existing;
}

function saveSession(from: string, updates: Partial<Omit<BotSession, 'updatedAt'>>): void {
  const current = getSession(from);
  sessions.set(from, { ...current, ...updates, updatedAt: Date.now() });
}

// ── Welcome ───────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE = `🔥 ¡Bienvenido a Los Vagones! 🚂

Somos una experiencia única de glamping en La Marquesa 🌲

Para ayudarte a encontrar la mejor cabaña, dime tus fechas de entrada y salida.

Ejemplo: del 20 al 22 de junio`;

// ── Restart intent ────────────────────────────────────────────────────────────

const RESTART_GREETING_KEYWORDS = new Set(['hola', 'buenas', 'buenos', 'hello', 'hi']);

const RESTART_PHRASES = [
  /\bempezar\s+de\s+(cero|nuevo)\b/,
  /\bvolver\s+a\s+empezar\b/,
  /\breiniciar\b/,
  /\breset\b/,
  /\bnueva\s+reserva\b/,
  /\bquiero\s+empezar\s+de\s+nuevo\b/,
];

function isRestartIntent(message: string): boolean {
  const lower = message.trim().toLowerCase();
  const firstWord = lower.split(/[\s,!.?¡¿]+/)[0];
  if (RESTART_GREETING_KEYWORDS.has(firstWord)) return true;
  return RESTART_PHRASES.some((re) => re.test(lower));
}

// ── Date intent ───────────────────────────────────────────────────────────────

const DATE_CONFIRM_RESPONSE = `Perfecto 👌

¿Me confirmas las fechas con mes? Por ejemplo: del 20 al 22 de junio`;

const SPANISH_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function isDateIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /\bal\b/.test(lower) && (/\bdel\b/.test(lower) || /\d/.test(lower));
}

function hasMonth(message: string): boolean {
  const lower = message.toLowerCase();
  return SPANISH_MONTHS.some((m) => lower.includes(m));
}

function extractIsoDates(message: string): { checkInDate: string; checkOutDate: string } | null {
  const matches = message.match(/\d{4}-\d{2}-\d{2}/g);
  if (matches && matches.length >= 2) {
    return { checkInDate: matches[0], checkOutDate: matches[1] };
  }
  return null;
}

// ── People intent ─────────────────────────────────────────────────────────────

function isPeopleIntent(message: string): boolean {
  const lower = message.toLowerCase();
  if (/\d+\s*(personas?|adultos?)/.test(lower)) return true;
  if (/\b(somos|vamos|para)\s+\d+/.test(lower)) return true;
  return false;
}

function extractPeople(message: string): number | null {
  const lower = message.toLowerCase();
  let m = lower.match(/(\d+)\s*(personas?|adultos?)/);
  if (m) return parseInt(m[1], 10);
  m = lower.match(/\b(?:somos|vamos|para)\s+(\d+)/);
  if (m) return parseInt(m[1], 10);
  return null;
}

// ── Cabin info intent ─────────────────────────────────────────────────────────

// Returns 1-based cabin index from "info 2", "información 3", "cuéntame de la 1", etc.
function getCabinInfoNumber(message: string): number | null {
  const lower = message.trim().toLowerCase();
  const patterns = [
    /^info\s*(\d+)$/,
    /^informaci[oó]n\s+(\d+)$/,
    /cu[eé]ntame.*?(?:de la|de)\s*(\d+)/,
    /(?:quiero saber|m[aá]s info|mas info).*?(?:de la|de)\s*(\d+)/,
    /m[aá]s informaci[oó]n.*?(?:de la|de)\s*(\d+)/,
  ];
  for (const re of patterns) {
    const m = lower.match(re);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

// ── Checkout helpers ──────────────────────────────────────────────────────────

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isYesReply(message: string): boolean {
  return /^(sí|si|yes|claro|confirmo|correcto|ok|dale|va|listo)$/i.test(message.trim());
}

function isNoReply(message: string): boolean {
  return /^(no|nope|corregir|cambiar|cancelar)$/i.test(message.trim());
}

function computeNights(checkIn: string, checkOut: string): number {
  return Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
  );
}

// ── Cabin booking URL builder ─────────────────────────────────────────────────

function buildCabinBookingUrl(slug: string, session: BotSession): string {
  const base = `${BOOKING_URL}/${slug}`;
  const { checkInDate, checkOutDate, people } = session;
  if (!checkInDate || !checkOutDate || !people) return base;
  const params = new URLSearchParams({
    checkIn: checkInDate,
    checkOut: checkOutDate,
    adults: String(people),
  });
  return `${base}?${params.toString()}`;
}

// ── Description shortener (max 2 sentences / 220 chars) ──────────────────────

function shortenDescription(desc: string): string {
  if (desc.length <= 180) return desc;
  const firstEnd = desc.search(/[.!?]\s/);
  if (firstEnd === -1 || firstEnd > 180) return desc.slice(0, 177) + '...';
  const first = desc.slice(0, firstEnd + 1);
  const rest = desc.slice(firstEnd + 2).trim();
  const secondEnd = rest.search(/[.!?]\s/);
  const second = secondEnd !== -1 ? rest.slice(0, secondEnd + 1) : rest;
  const combined = `${first} ${second}`;
  return combined.length <= 220 ? combined : first;
}

// ── Cabin list formatter (shared by direct search and OpenAI tool path) ───────

function formatCabinList(cabins: BotCabin[]): string {
  const lines = cabins
    .map((c, i) => {
      const capacity = c.capacityAdults ? ` — hasta ${c.capacityAdults} personas` : '';
      return `${i + 1}. ${c.name} — $${Math.round(c.priceFrom)} MXN/noche${capacity}`;
    })
    .join('\n');
  return (
    `🔥 ¡Buenas noticias! Sí tenemos disponibilidad para esas fechas.\n\n` +
    `Estas son las opciones disponibles:\n\n${lines}\n\n` +
    `Puedes responder con el número de la cabaña que prefieras o pedirme más información, por ejemplo: info 2`
  );
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Mexico_City',
  });
  return `Eres el asistente oficial de WhatsApp de Los Vagones, un hotel/glamping de cabañas en La Marquesa, Estado de México.

Tu objetivo es ayudar a los huéspedes a hacer una reserva.

Fecha actual: ${today}.

Reglas:
- Responde siempre en español
- Sé amable, conciso y profesional
- No inventes disponibilidad, precios, políticas ni detalles de las cabañas
- Si el usuario menciona fechas concretas de entrada y salida, usa la herramienta search_availability para consultar disponibilidad real
- Si las fechas no están claras o faltan, pide la fecha de entrada y salida antes de buscar
- Cuando haya cabañas disponibles, el sistema presentará la lista al usuario automáticamente — no tienes que formatearla
- Si no hay disponibilidad, indícalo claramente y pregunta si quiere intentar con otras fechas
- Mantén las respuestas cortas y enfocadas en la conversión

Formato (IMPORTANTE — esto es WhatsApp, no un navegador):
- Usa solo texto plano
- No uses markdown: nada de **negrita**, _cursiva_, ni enlaces tipo [texto](url)
- Puedes usar guiones "-" para listas cortas
- Escribe las URLs completas como texto plano, por ejemplo: ${BOOKING_URL}
- Nunca uses corchetes ni paréntesis para ocultar una URL`;
}

// ── Tools ─────────────────────────────────────────────────────────────────────

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_availability',
      description:
        'Search real cabin availability for Los Vagones for a given check-in and check-out date. Only call this when both dates are clearly specified by the user.',
      parameters: {
        type: 'object',
        properties: {
          checkInDate: {
            type: 'string',
            description: 'Check-in date in YYYY-MM-DD format',
          },
          checkOutDate: {
            type: 'string',
            description: 'Check-out date in YYYY-MM-DD format',
          },
        },
        required: ['checkInDate', 'checkOutDate'],
      },
    },
  },
];

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class BotAiService implements OnModuleInit {
  private readonly logger = new Logger(BotAiService.name);
  private readonly client: OpenAI | null;
  private readonly baseUrl: string;
  private botHotelId: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly botAvailabilityService: BotAvailabilityService,
    private readonly botFollowUpService: BotFollowUpService,
    private readonly analyticsService: BotAnalyticsService,
    private readonly botKnowledgeService: BotKnowledgeService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set — BotAiService will return fallback responses');
      this.client = null;
    } else {
      this.client = new OpenAI({ apiKey });
    }
    const port = this.configService.get<string>('PORT') ?? '4000';
    const internalApiUrl = this.configService.get<string>('INTERNAL_API_URL');
    this.baseUrl = internalApiUrl ?? `http://127.0.0.1:${port}`;
    this.logger.log(`[BOT VERSION] v3-refactored-flow — baseUrl: ${this.baseUrl}`);

    if (!this.configService.get<string>('STRIPE_SECRET_KEY')) {
      this.logger.error('[BOT VERSION] STRIPE_SECRET_KEY is not set — checkout sessions will fail');
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      const hotel = await this.prisma.hotel.findUnique({
        where: { slug: BOT_HOTEL_SLUG },
        select: { id: true },
      });
      this.botHotelId = hotel?.id ?? null;
      if (this.botHotelId) {
        this.logger.log(`[BOT] Resolved hotel: ${BOT_HOTEL_SLUG} → ${this.botHotelId}`);
      } else {
        this.logger.warn(`[BOT] Hotel slug not found in DB: ${BOT_HOTEL_SLUG}`);
      }
    } catch (err: any) {
      this.logger.error(`[BOT] Hotel ID lookup failed at init: ${err?.message}`);
    }
  }

  // Fire-and-forget analytics — never throws, never blocks bot flow
  private track(call: Promise<void>): void {
    call.catch((err: any) =>
      this.logger.error(`[BOT ANALYTICS] ${err?.message}`),
    );
  }

  async generateResponse(input: { from: string; message: string }): Promise<string> {
    const hid = this.botHotelId ?? '';

    // ── 1. Restart intent — clears session entirely before anything else ────────
    if (isRestartIntent(input.message)) {
      sessions.delete(input.from);
      // Pre-create fresh session with conversationTracked=true to prevent double-track
      saveSession(input.from, { conversationTracked: true });
      const freshSession = getSession(input.from);
      this.track(
        this.analyticsService.trackConversationStarted({
          hotelId: hid,
          whatsappFrom: input.from,
          sessionId: freshSession.sessionId,
        }),
      );
      return WELCOME_MESSAGE;
    }

    const session = getSession(input.from);

    // ── 1a. Track conversation start for fresh sessions ─────────────────────────
    if (!session.conversationTracked) {
      saveSession(input.from, { conversationTracked: true });
      this.track(
        this.analyticsService.trackConversationStarted({
          hotelId: hid,
          whatsappFrom: input.from,
          sessionId: session.sessionId,
        }),
      );
    }

    // ── 1b. Idempotency recovery — return existing checkout URL if already completed ──
    if (session.checkoutUrl && isYesReply(input.message)) {
      return `🔥 Ya tienes un link activo para tu reserva:\n\n${session.checkoutUrl}\n\n⚠️ Este link puede expirar. Si ya no funciona, escríbeme y te ayudo.`;
    }

    // ── 1c. FAQ knowledge lookup — intercept before AI paths ────────────────────
    // Skip during active checkout so the state machine is not interrupted
    if (!session.checkoutStep) {
      const faqAnswer = this.botKnowledgeService.findMatch(input.message);
      if (faqAnswer) return faqAnswer;
    }

    // ── 2. Active checkout flow ─────────────────────────────────────────────────
    if (session.checkoutStep) {
      const msg = input.message.trim();

      if (session.checkoutStep === 'people') {
        const n = parseInt(msg, 10);
        if (!Number.isInteger(n) || n < 1) {
          return `Por favor indica el número de personas (por ejemplo: 2).`;
        }
        saveSession(input.from, { people: n, checkoutStep: 'full_name' });
        this.track(
          this.analyticsService.trackPeopleProvided({
            hotelId: hid,
            whatsappFrom: input.from,
            sessionId: session.sessionId,
            metadata: { adults: n },
          }),
        );
        return `Anotado, ${n} persona${n === 1 ? '' : 's'} 🙌\n\n👉 ¿Cuál es tu nombre completo?`;
      }

      if (session.checkoutStep === 'full_name') {
        const parts = msg.split(/\s+/);
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ') || 'N/A';
        saveSession(input.from, { guestFirstName: firstName, guestLastName: lastName, checkoutStep: 'email' });
        return `Gracias, ${firstName} 👋\n\n👉 ¿A qué correo quieres que enviemos la confirmación?`;
      }

      if (session.checkoutStep === 'email') {
        if (!isValidEmail(msg)) {
          return `Ese correo no parece válido. ¿Me lo puedes enviar de nuevo?`;
        }
        saveSession(input.from, { guestEmail: msg, checkoutStep: 'confirm' });
        this.track(
          this.analyticsService.trackEmailProvided({
            hotelId: hid,
            whatsappFrom: input.from,
            sessionId: session.sessionId,
          }),
        );
        const updated = getSession(input.from);
        const cabin = updated.selectedCabin;

        // Fetch real quote — fail gracefully, fall back to estimate
        let quote: BotQuote | null = null;
        if (cabin && updated.checkInDate && updated.checkOutDate && updated.people) {
          quote = await this.fetchQuote(cabin, updated);
          if (quote) saveSession(input.from, { quote });
        }

        const nights =
          updated.checkInDate && updated.checkOutDate
            ? computeNights(updated.checkInDate, updated.checkOutDate)
            : null;
        const dateRange =
          updated.checkInDate && updated.checkOutDate
            ? `${updated.checkInDate} al ${updated.checkOutDate}`
            : updated.rawDateText ?? 'fechas por confirmar';

        let summary =
          `Perfecto 🙌\n\nConfirma que estos datos estén correctos:\n\n` +
          `- Cabaña: ${cabin?.name ?? '(sin seleccionar)'}\n` +
          `- Fechas: ${dateRange}\n`;
        if (nights !== null) summary += `- Noches: ${nights}\n`;
        summary += `- Personas: ${updated.people}\n`;

        if (quote) {
          const cur = quote.currency || 'MXN';
          summary += `\nResumen de pago:\n`;
          summary += `- Subtotal: $${Math.round(quote.subtotal).toLocaleString('es-MX')} ${cur}\n`;
          if (quote.tax > 0) {
            summary += `- IVA: $${Math.round(quote.tax).toLocaleString('es-MX')} ${cur}\n`;
          }
          if (quote.serviceFee > 0) {
            summary += `- Cargo por servicio: $${Math.round(quote.serviceFee).toLocaleString('es-MX')} ${cur}\n`;
          }
          summary += `\nTOTAL: $${Math.round(quote.total).toLocaleString('es-MX')} ${cur}\n`;
        } else {
          // Fallback: estimate from priceFrom × nights (no tax/fees)
          const estimatedTotal =
            cabin && nights !== null ? Math.round(cabin.priceFrom * nights) : null;
          if (cabin) summary += `- Precio por noche: $${Math.round(cabin.priceFrom).toLocaleString('es-MX')} MXN\n`;
          if (estimatedTotal !== null) summary += `- Total estimado: $${estimatedTotal.toLocaleString('es-MX')} MXN*\n`;
        }

        summary +=
          `\n- Nombre: ${updated.guestFirstName} ${updated.guestLastName}\n` +
          `- Email: ${msg}\n\n`;
        if (!quote) summary += `*El total final puede incluir impuestos y cargos adicionales.\n\n`;
        summary += `Responde "sí" para generarte el link de pago, o "no" para corregir.`;
        return summary;
      }

      if (session.checkoutStep === 'confirm') {
        this.logger.log(`[BOT CHECKOUT] confirm branch entered for ${input.from} — reply: "${msg}"`);

        if (isYesReply(msg)) {
          // Idempotency guard
          if (session.reservationId && session.checkoutUrl) {
            this.logger.log(`[BOT CHECKOUT] idempotency hit for ${input.from} — returning existing link`);
            return `🔥 Ya tienes un link activo para tu reserva:\n\n${session.checkoutUrl}\n\n⚠️ Este link puede expirar. Si ya no funciona escríbeme y te genero uno nuevo.`;
          }

          const { selectedCabin, checkInDate, checkOutDate, people, guestFirstName, guestLastName, guestEmail } = session;

          console.log('[BOT CHECKOUT] session snapshot:', {
            from: input.from,
            selectedCabinId: selectedCabin?.id,
            selectedCabinName: selectedCabin?.name,
            checkInDate,
            checkOutDate,
            people,
            guestFirstName,
            guestLastName,
            guestEmail,
            baseUrl: this.baseUrl,
          });

          if (!selectedCabin?.id || !checkInDate || !checkOutDate || !people || !guestFirstName || !guestLastName || !guestEmail) {
            this.logger.warn(
              `[BOT CHECKOUT] failed: missing session fields — cabin=${selectedCabin?.id} ci=${checkInDate} co=${checkOutDate} people=${people} name=${guestFirstName} ${guestLastName} email=${guestEmail}`,
            );
            const fallbackUrl = selectedCabin ? buildCabinBookingUrl(selectedCabin.slug, session) : BOOKING_URL;
            saveSession(input.from, { checkoutStep: undefined });
            return `Tuve un problema generando tu link de pago 😔\n\nPuedes reservar directamente aquí:\n${fallbackUrl}`;
          }

          const reservationPayload = {
            roomTypeId: selectedCabin.id,
            checkInDate,
            checkOutDate,
            adults: people,
            children: 0,
            firstName: guestFirstName,
            lastName: guestLastName,
            email: guestEmail,
          };

          console.log('[BOT CHECKOUT] payload:', reservationPayload);

          let reservationId: string;
          try {
            reservationId = await this.createPublicReservation(reservationPayload);
            saveSession(input.from, { reservationId });
            console.log('[BOT CHECKOUT] reservation response:', { id: reservationId });
            this.logger.log(`[BOT CHECKOUT] reservation created: ${reservationId}`);
          } catch (err: any) {
            console.error('[BOT CHECKOUT] ERROR (reservation):', err);
            this.logger.error(`[BOT CHECKOUT] failed: reservation creation — ${err?.message}`);
            const fallbackUrl = buildCabinBookingUrl(selectedCabin.slug, session);
            saveSession(input.from, { checkoutStep: undefined });
            return `Tuve un problema creando tu reserva 😔\n\nPuedes intentarlo directamente aquí:\n${fallbackUrl}`;
          }

          console.log('[BOT CHECKOUT] creating checkout session for:', reservationId);

          let checkoutUrl: string;
          try {
            checkoutUrl = await this.createCheckoutSession(reservationId);
            saveSession(input.from, { checkoutUrl, checkoutStep: undefined });
            console.log('[BOT CHECKOUT] checkout response:', { checkoutUrl });
            this.logger.log(`[BOT CHECKOUT] checkout session created: ${checkoutUrl}`);
          } catch (err: any) {
            console.error('[BOT CHECKOUT] ERROR (checkout session):', err);
            this.logger.error(`[BOT CHECKOUT] failed: checkout session creation — ${err?.message}`);
            const fallbackUrl = buildCabinBookingUrl(selectedCabin.slug, session);
            saveSession(input.from, { checkoutStep: undefined });
            return `Reserva creada, pero no pude generar el link de pago 😔\n\nCompleta el pago aquí:\n${fallbackUrl}`;
          }

          // Track checkout link generated
          const currentSession = getSession(input.from);
          const q = currentSession.quote;
          this.track(
            this.analyticsService.trackCheckoutLinkGenerated({
              hotelId: hid,
              whatsappFrom: input.from,
              sessionId: session.sessionId,
              reservationId,
              roomTypeId: selectedCabin.id,
              metadata: q
                ? { nights: q.nights, quoteAmount: q.total, currency: q.currency }
                : undefined,
            }),
          );

          // Schedule follow-up — fire-and-forget, never blocks the checkout response
          this.botFollowUpService
            .scheduleFollowUp({
              reservationId,
              whatsappFrom: input.from,
              guestFirstName: guestFirstName ?? '',
              checkoutUrl,
            })
            .catch((err: any) =>
              this.logger.error(`[BOT FOLLOW-UP] schedule failed: ${err?.message}`),
            );

          return `🔥 Ya quedó todo listo.\n\n👉 Aquí puedes pagar y asegurar tu cabaña:\n${checkoutUrl}\n\n⚠️ Este link puede expirar. Si ya no funciona escríbeme y te genero uno nuevo.`;
        }

        if (isNoReply(msg)) {
          saveSession(input.from, {
            checkoutStep: 'people',
            people: undefined,
            guestFirstName: undefined,
            guestLastName: undefined,
            guestEmail: undefined,
            quote: undefined,
          });
          return `Sin problema 😊 Empecemos de nuevo.\n\n👉 ¿Para cuántas personas sería la estancia?`;
        }

        return `Por favor responde "sí" para confirmar o "no" para corregir los datos.`;
      }
    }

    // ── 3. Cabin info intent (requires active cabin list) ───────────────────────
    if (session.availableCabins?.length) {
      // "ver opciones" — re-render the cabin list without touching session
      if (/^ver\s+opciones?$/i.test(input.message.trim())) {
        return formatCabinList(session.availableCabins);
      }

      const infoN = getCabinInfoNumber(input.message);
      if (infoN !== null && infoN >= 1 && infoN <= session.availableCabins.length) {
        const cabin = session.availableCabins[infoN - 1];
        const catalog = await this.fetchCatalogCache(input.from);
        const detail = catalog.find((c) => c.slug === cabin.slug);
        this.track(
          this.analyticsService.trackCabinInfoViewed({
            hotelId: hid,
            whatsappFrom: input.from,
            sessionId: session.sessionId,
            roomTypeId: cabin.id,
            metadata: { cabinName: cabin.name, position: infoN },
          }),
        );
        return this.formatCabinInfoResponse(cabin, detail, infoN, session.availableCabins.length);
      }

      // ── 4. Cabin selection (bare integer) ─────────────────────────────────────
      if (/^\d+$/.test(input.message.trim())) {
        const n = parseInt(input.message.trim(), 10);
        if (n >= 1 && n <= session.availableCabins.length) {
          const cabin = session.availableCabins[n - 1];
          const bookingUrl = buildCabinBookingUrl(cabin.slug, session);
          saveSession(input.from, { selectedCabin: cabin, checkoutStep: 'people' });
          this.track(
            this.analyticsService.trackCabinSelected({
              hotelId: hid,
              whatsappFrom: input.from,
              sessionId: session.sessionId,
              roomTypeId: cabin.id,
              metadata: { cabinName: cabin.name, priceFrom: cabin.priceFrom },
            }),
          );
          this.track(
            this.analyticsService.trackCheckoutStarted({
              hotelId: hid,
              whatsappFrom: input.from,
              sessionId: session.sessionId,
              roomTypeId: cabin.id,
              metadata: { cabinName: cabin.name },
            }),
          );
          return (
            `🔥 Excelente elección: ${cabin.name}\n\n` +
            `Para generarte el link de pago necesito unos datos.\n\n` +
            `👉 ¿Para cuántas personas sería la estancia?\n\n` +
            `También puedes reservar en línea:\n${bookingUrl}`
          );
        }
      }
    }

    // ── 5. Date intent → search availability immediately when ISO is extractable ─
    const dateDetected = isDateIntent(input.message);
    const peopleDetected = isPeopleIntent(input.message);

    if (dateDetected) {
      // Capture people count if included in the same message
      if (peopleDetected) {
        const people = extractPeople(input.message);
        if (people !== null) saveSession(input.from, { people });
      }

      const isoDates = extractIsoDates(input.message);
      if (isoDates) {
        saveSession(input.from, isoDates);
        const nights = computeNights(isoDates.checkInDate, isoDates.checkOutDate);
        this.track(
          this.analyticsService.trackDatesProvided({
            hotelId: hid,
            whatsappFrom: input.from,
            sessionId: session.sessionId,
            metadata: { checkIn: isoDates.checkInDate, checkOut: isoDates.checkOutDate, nights },
          }),
        );
        return this.searchAndFormatAvailability(
          input.from,
          isoDates.checkInDate,
          isoDates.checkOutDate,
          hid,
          session.sessionId,
        );
      }

      if (hasMonth(input.message)) {
        saveSession(input.from, { rawDateText: input.message });
        // OpenAI resolves the month+day to ISO and calls search_availability tool
        return this.callOpenAi(input, '', hid, session.sessionId);
      }

      return DATE_CONFIRM_RESPONSE;
    }

    // ── 6. People intent only (no date in this message) ─────────────────────────
    if (peopleDetected) {
      const people = extractPeople(input.message);
      if (people !== null) {
        saveSession(input.from, { people });
        const updated = getSession(input.from);
        if (updated.checkInDate && updated.checkOutDate) {
          return this.searchAndFormatAvailability(
            input.from,
            updated.checkInDate,
            updated.checkOutDate,
            hid,
            session.sessionId,
          );
        }
        if (updated.rawDateText) {
          const enriched = `El huésped quiere reservar para ${people} personas ${updated.rawDateText}. Verifica disponibilidad.`;
          return this.callOpenAi({ from: input.from, message: enriched }, '', hid, session.sessionId);
        }
        return `Gracias 🙌\n\n👉 ¿Para qué fechas te gustaría hospedarte?\nEjemplo: del 20 al 22 de junio`;
      }
    }

    // ── 7. Free-form → OpenAI ────────────────────────────────────────────────────
    return this.callOpenAi(input, '', hid, session.sessionId);
  }

  private formatCabinInfoResponse(
    cabin: BotCabin,
    detail: BotCatalogItem | undefined,
    n: number,
    totalCabins: number,
  ): string {
    const rawDescription =
      detail?.description ?? 'Una cabaña diseñada para una experiencia única en La Marquesa.';
    const description = shortenDescription(rawDescription);

    // Specs line (only defined fields)
    const specParts: string[] = [];
    if (cabin.capacityAdults) specParts.push(`👥 Hasta ${cabin.capacityAdults} personas`);
    if (detail?.bedType) specParts.push(`🛏️ ${detail.bedType}`);
    if (detail?.sizeM2) specParts.push(`📐 ${detail.sizeM2} m²`);
    specParts.push(`💰 Desde $${Math.round(cabin.priceFrom).toLocaleString('es-MX')} MXN/noche`);
    const specsBlock = specParts.join('\n');

    // Up to 5 amenity highlights
    const highlights = (detail?.amenities ?? []).slice(0, 5);
    const highlightsBlock = highlights.length
      ? `\n✨ Destacados:\n${highlights.map((a) => `• ${a}`).join('\n')}`
      : '';

    // Navigation footer
    const altN = n === 1 ? 2 : 1;
    const altHint = totalCabins > 1 ? `\n• "info ${altN}" para conocer otra cabaña` : '';
    const footer =
      `👉 Responde con el número ${n} para reservar esta cabaña.\n\n` +
      `o escribe:\n• "ver opciones" para ver la lista completa${altHint}`;

    return (
      `🏕️ ${cabin.name}\n\n` +
      `${description}\n\n` +
      `${specsBlock}` +
      `${highlightsBlock}\n\n` +
      `${footer}`
    );
  }

  private async searchAndFormatAvailability(
    from: string,
    checkInDate: string,
    checkOutDate: string,
    hotelId: string,
    sessionId: string | undefined,
  ): Promise<string> {
    this.logger.log(`[BOT AVAIL] searching ${checkInDate}→${checkOutDate} for ${from}`);
    try {
      const availability = await this.botAvailabilityService.searchAvailability({ checkInDate, checkOutDate });
      if (availability.availableCabins.length === 0) {
        saveSession(from, { availableCabins: undefined, checkInDate, checkOutDate });
        return `Lo siento, no tenemos disponibilidad para esas fechas 😔\n\n¿Quieres intentar con otras fechas? Puedo revisar cualquier período.`;
      }
      saveSession(from, { availableCabins: availability.availableCabins, checkInDate, checkOutDate });
      this.track(
        this.analyticsService.trackAvailabilityShown({
          hotelId,
          whatsappFrom: from,
          sessionId,
          metadata: { cabinCount: availability.availableCabins.length },
        }),
      );
      return formatCabinList(availability.availableCabins);
    } catch (err: any) {
      this.logger.error(`[BOT AVAIL] search failed: ${err?.message}`);
      return `No pude verificar disponibilidad en este momento 😔\n\nIntenta de nuevo o visita:\n${BOOKING_URL}`;
    }
  }

  private async fetchCatalogCache(from: string): Promise<BotCatalogItem[]> {
    const session = getSession(from);
    if (session.catalogCache) return session.catalogCache;
    const url = `${this.baseUrl}/api/public/catalog/${BOT_HOTEL_SLUG}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Catalog API returned HTTP ${res.status}`);
      const data = (await res.json()) as any[];
      const cache: BotCatalogItem[] = data.map((rt: any) => ({
        id: rt.id as string,
        slug: rt.slug as string,
        name: rt.name as string,
        description: rt.description as string | null | undefined,
        sizeM2: rt.sizeM2 as number | null | undefined,
        bedType: rt.bedType as string | null | undefined,
        amenities: ((rt.amenities ?? []) as any[]).map((a: any) => a.name as string),
      }));
      saveSession(from, { catalogCache: cache });
      return cache;
    } catch (err: any) {
      this.logger.error(`[BOT CATALOG] fetch failed: ${err?.message}`);
      return [];
    }
  }

  private async createPublicReservation(payload: {
    roomTypeId: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<string> {
    const url = `${this.baseUrl}/api/public/reservations`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotelSlug: BOT_HOTEL_SLUG, ...payload }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Reservations API returned HTTP ${res.status}: ${text}`);
    }
    const data = await res.json();
    const id = data?.reservation?.id as string | undefined;
    if (!id) throw new Error('Reservations API response missing reservation.id');
    return id;
  }

  private async createCheckoutSession(reservationId: string): Promise<string> {
    const url = `${this.baseUrl}/api/public/payments/checkout-session`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Payments API returned HTTP ${res.status}: ${text}`);
    }
    const data = await res.json();
    const checkoutUrl = data?.checkoutUrl as string | undefined;
    if (!checkoutUrl) throw new Error('Payments API response missing checkoutUrl');
    return checkoutUrl;
  }

  private async fetchQuote(cabin: BotCabin, session: BotSession): Promise<BotQuote | null> {
    const { checkInDate, checkOutDate, people } = session;
    if (!checkInDate || !checkOutDate || !people) return null;
    const url = `${this.baseUrl}/api/public/reservations/quote`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelSlug: BOT_HOTEL_SLUG,
          roomTypeId: cabin.id,
          checkInDate,
          checkOutDate,
          adults: people,
          children: 0,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`[BOT QUOTE] API returned HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      return {
        nights: Number(data.nights),
        pricePerNight: Number(data.pricePerNight),
        subtotal: Number(data.subtotal),
        tax: Number(data.tax),
        serviceFee: Number(data.serviceFee),
        total: Number(data.total),
        currency: String(data.currency ?? 'MXN'),
      };
    } catch (err: any) {
      this.logger.warn(`[BOT QUOTE] fetch failed: ${err?.message}`);
      return null;
    }
  }

  private async callOpenAi(
    input: { from: string; message: string },
    prefix: string,
    hotelId: string,
    sessionId: string | undefined,
  ): Promise<string> {
    if (!this.client) {
      return prefix ? `${prefix}\n\n${FALLBACK_RESPONSE}` : FALLBACK_RESPONSE;
    }

    let aiResult: string;

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: input.message },
      ];

      const first = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 400,
        tools: TOOLS,
        tool_choice: 'auto',
        messages,
      });

      const firstChoice = first.choices[0];
      const firstMessage = firstChoice.message;

      if (firstChoice.finish_reason === 'tool_calls' && firstMessage.tool_calls?.length) {
        const toolCall = firstMessage.tool_calls[0];

        if (toolCall.type === 'function' && toolCall.function.name === 'search_availability') {
          const args = JSON.parse(toolCall.function.arguments) as {
            checkInDate: string;
            checkOutDate: string;
          };

          this.logger.log(
            `[BotAiService] search_availability called: ${args.checkInDate} → ${args.checkOutDate} (from: ${input.from})`,
          );

          // Track dates resolved by OpenAI
          const nights = computeNights(args.checkInDate, args.checkOutDate);
          this.track(
            this.analyticsService.trackDatesProvided({
              hotelId,
              whatsappFrom: input.from,
              sessionId,
              metadata: { checkIn: args.checkInDate, checkOut: args.checkOutDate, nights },
            }),
          );

          let toolResultContent: string;
          let cabinListResponse: string | null = null;

          try {
            const availability = await this.botAvailabilityService.searchAvailability(args);

            if (availability.availableCabins.length > 0) {
              saveSession(input.from, {
                availableCabins: availability.availableCabins,
                checkInDate: args.checkInDate,
                checkOutDate: args.checkOutDate,
              });
              cabinListResponse = formatCabinList(availability.availableCabins);
              this.track(
                this.analyticsService.trackAvailabilityShown({
                  hotelId,
                  whatsappFrom: input.from,
                  sessionId,
                  metadata: { cabinCount: availability.availableCabins.length },
                }),
              );
            } else {
              saveSession(input.from, {
                availableCabins: undefined,
                checkInDate: args.checkInDate,
                checkOutDate: args.checkOutDate,
              });
            }

            toolResultContent = JSON.stringify(availability);
          } catch (err: any) {
            this.logger.error(`Availability fetch failed: ${err?.message}`);
            toolResultContent = JSON.stringify({
              error: 'No se pudo consultar la disponibilidad en este momento.',
            });
          }

          if (cabinListResponse !== null) {
            aiResult = cabinListResponse;
          } else {
            const second = await this.client.chat.completions.create({
              model: 'gpt-4o-mini',
              temperature: 0.4,
              max_tokens: 400,
              messages: [
                ...messages,
                firstMessage,
                {
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: toolResultContent,
                },
              ],
            });
            aiResult = second.choices[0]?.message?.content?.trim() ?? FALLBACK_RESPONSE;
          }
        } else {
          aiResult = firstMessage.content?.trim() ?? FALLBACK_RESPONSE;
        }
      } else {
        aiResult = firstMessage.content?.trim() ?? FALLBACK_RESPONSE;
      }
    } catch (error: any) {
      this.logger.error(
        `OpenAI request failed for ${input.from}: ${error?.message ?? error}`,
        error?.stack,
      );
      aiResult = FALLBACK_RESPONSE;
    }

    return prefix ? `${prefix}\n\n${aiResult}` : aiResult;
  }
}
