import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BotAvailabilityService } from './bot.availability';

const FALLBACK_RESPONSE =
  'Gracias por escribir a Los Vagones. En este momento estamos configurando nuestro asistente automático. Para reservar, visita https://losvagones.mx';

const BOOKING_URL = 'https://losvagones.mx/booking';

const SYSTEM_PROMPT = `Eres el asistente oficial de WhatsApp de Los Vagones, un hotel/glamping de cabañas en La Marquesa, Estado de México.

Tu objetivo es ayudar a los huéspedes a hacer una reserva.

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
    if (!this.client) {
      return FALLBACK_RESPONSE;
    }

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
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

          return second.choices[0]?.message?.content?.trim() ?? FALLBACK_RESPONSE;
        }
      }

      // Model replied directly without calling a tool
      return firstMessage.content?.trim() ?? FALLBACK_RESPONSE;

    } catch (error: any) {
      this.logger.error(
        `OpenAI request failed for ${input.from}: ${error?.message ?? error}`,
        error?.stack,
      );
      return FALLBACK_RESPONSE;
    }
  }
}
