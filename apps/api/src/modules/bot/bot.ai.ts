import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const FALLBACK_RESPONSE =
  'Gracias por escribir a Los Vagones. En este momento estamos configurando nuestro asistente automático. Para reservar, visita https://losvagones.mx';

const SYSTEM_PROMPT = `Eres el asistente oficial de WhatsApp de Los Vagones, un hotel/glamping de cabañas en La Marquesa, Estado de México.

Tu objetivo es ayudar a los huéspedes a hacer una reserva.

Reglas:
- Responde siempre en español
- Sé amable, conciso y profesional
- No inventes disponibilidad, precios, políticas ni detalles de las cabañas
- Si el usuario pregunta por disponibilidad o precios, pídele las fechas de entrada y salida
- Si el usuario está listo para reservar, envíalo a https://losvagones.mx
- Mantén las respuestas cortas y enfocadas en la conversión`;

@Injectable()
export class BotAiService {
  private readonly logger = new Logger(BotAiService.name);
  private readonly client: OpenAI | null;

  constructor(private readonly configService: ConfigService) {
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
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: input.message },
        ],
      });

      return completion.choices[0]?.message?.content?.trim() ?? FALLBACK_RESPONSE;
    } catch (error: any) {
      this.logger.error(
        `OpenAI request failed for ${input.from}: ${error?.message ?? error}`,
        error?.stack,
      );
      return FALLBACK_RESPONSE;
    }
  }
}
