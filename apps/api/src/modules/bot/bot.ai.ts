import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BotAvailabilityService } from './bot.availability';

// ── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_RESPONSE =
  'Gracias por escribir a Los Vagones. En este momento estamos configurando nuestro asistente automático. Para reservar, visita https://losvagones.mx';

const BOOKING_URL = 'https://losvagones.mx/booking';

// ── Session memory ───────────────────────────────────────────────────────────

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

type BotSession = {
  checkInDate?: string;  // ISO YYYY-MM-DD — only when safely extractable
  checkOutDate?: string; // ISO YYYY-MM-DD — only when safely extractable
  rawDateText?: string;  // Original user text when ISO extraction not possible
  people?: number;
  updatedAt: number;
};

const sessions = new Map<string, BotSession>();

function getSession(from: string): BotSession {
  const existing = sessions.get(from);
  if (!existing || Date.now() - existing.updatedAt > SESSION_TTL_MS) {
    const fresh: BotSession = { updatedAt: Date.now() };
    sessions.set(from, fresh);
    return fresh;
  }
  return existing;
}

function saveSession(from: string, updates: Partial<Omit<BotSession, 'updatedAt'>>): void {
  const current = getSession(from);
  sessions.set(from, { ...current, ...updates, updatedAt: Date.now() });
}

// ── Greeting ─────────────────────────────────────────────────────────────────

const GREETING_KEYWORDS = new Set(['hola', 'buenas', 'buenos', 'hello', 'hi']);

const WELCOME_MESSAGE = `¡Hola! 👋 Bienvenido a Los Vagones 🚂

Somos una experiencia única en La Marquesa 🌲

Puedo ayudarte a:

1️⃣ Ver disponibilidad
2️⃣ Cotizar tu estancia
3️⃣ Reservar ahora mismo

¿Para qué fechas te gustaría hospedarte?`;

function isGreeting(message: string): boolean {
  const firstWord = message.trim().toLowerCase().split(/[\s,!.?¡¿]+/)[0];
  return GREETING_KEYWORDS.has(firstWord);
}

// ── Date intent ───────────────────────────────────────────────────────────────

const DATE_INTENT_RESPONSE = `Perfecto 👌

Déjame revisar disponibilidad para esas fechas…

👉 ¿Para cuántas personas sería tu estancia?`;

const DATE_CONFIRM_RESPONSE = `Perfecto 👌

¿Me confirmas las fechas con mes? Por ejemplo: del 20 al 22 de junio`;

const SPANISH_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function isDateIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const hasAl = /\bal\b/.test(lower);
  const hasDel = /\bdel\b/.test(lower);
  const hasNumbers = /\d/.test(lower);
  return hasAl && (hasDel || hasNumbers);
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

const PEOPLE_INTENT_PREFIX = `Perfecto 🙌

Con esa información, déjame mostrarte las mejores opciones disponibles…`;

const NO_DATES_RESPONSE = `Claro, con gusto te ayudo 😊

¿Para qué fechas te gustaría hospedarte?
Ejemplo: del 20 al 22 de junio`;

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

// ── System prompt (built fresh per request for live date anchor) ──────────────

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
- Cuando haya cabañas disponibles, lístalas con su precio base y envía al usuario a reservar: ${BOOKING_URL}
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
export class BotAiService {
  private readonly logger = new Logger(BotAiService.name);
  private readonly client: OpenAI | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly botAvailabilityService: BotAvailabilityService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set — BotAiService will return fallback responses');
      this.client = null;
    } else {
      this.client = new OpenAI({ apiKey });
    }
  }

  async generateResponse(input: { from: string; message: string }): Promise<string> {
    const session = getSession(input.from);

    // A. Greeting → welcome, leave session intact
    if (isGreeting(input.message)) {
      return WELCOME_MESSAGE;
    }

    const dateDetected = isDateIntent(input.message);
    const peopleDetected = isPeopleIntent(input.message);

    // B. Complete query: dates + people together → skip guided heuristics, let OpenAI handle it
    if (dateDetected && peopleDetected) {
      const people = extractPeople(input.message);
      if (people !== null) saveSession(input.from, { people });
      const isoDates = extractIsoDates(input.message);
      if (isoDates) saveSession(input.from, isoDates);
      return this.callOpenAi(input, '');
    }

    // C. Date intent only
    if (dateDetected) {
      const isoDates = extractIsoDates(input.message);
      if (isoDates) {
        saveSession(input.from, isoDates);
      } else if (hasMonth(input.message)) {
        saveSession(input.from, { rawDateText: input.message });
      } else {
        // No month info — cannot store safely, ask to confirm
        return DATE_CONFIRM_RESPONSE;
      }

      // If people count already captured in a prior turn, proceed directly to availability
      const updated = getSession(input.from);
      if (updated.people) {
        const dateRef =
          updated.checkInDate && updated.checkOutDate
            ? `del ${updated.checkInDate} al ${updated.checkOutDate}`
            : updated.rawDateText!;
        const enriched = `El huésped quiere reservar para ${updated.people} personas ${dateRef}. Verifica disponibilidad.`;
        return this.callOpenAi({ from: input.from, message: enriched }, PEOPLE_INTENT_PREFIX);
      }

      return DATE_INTENT_RESPONSE;
    }

    // D. People intent only
    if (peopleDetected) {
      const people = extractPeople(input.message);
      if (people !== null) {
        saveSession(input.from, { people });

        if (session.checkInDate && session.checkOutDate) {
          const enriched = `El huésped quiere reservar para ${people} personas del ${session.checkInDate} al ${session.checkOutDate}. Verifica disponibilidad.`;
          return this.callOpenAi({ from: input.from, message: enriched }, PEOPLE_INTENT_PREFIX);
        }

        if (session.rawDateText) {
          const enriched = `El huésped quiere reservar para ${people} personas ${session.rawDateText}. Verifica disponibilidad.`;
          return this.callOpenAi({ from: input.from, message: enriched }, PEOPLE_INTENT_PREFIX);
        }

        return NO_DATES_RESPONSE;
      }
      // Regex matched but extractPeople returned null — fall through to OpenAI
    }

    // E. Free-form / unrecognised — let OpenAI handle it
    return this.callOpenAi(input, '');
  }

  private async callOpenAi(
    input: { from: string; message: string },
    prefix: string,
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

      // Model decided to call the search_availability tool
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

          let toolResultContent: string;
          try {
            const availability = await this.botAvailabilityService.searchAvailability(args);
            toolResultContent = JSON.stringify(availability);
          } catch (err: any) {
            this.logger.error(`Availability fetch failed: ${err?.message}`);
            toolResultContent = JSON.stringify({
              error: 'No se pudo consultar la disponibilidad en este momento.',
            });
          }

          // Second call: feed tool result back and get the final Spanish reply
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
        } else {
          aiResult = firstMessage.content?.trim() ?? FALLBACK_RESPONSE;
        }
      } else {
        // Model replied directly without calling a tool
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
