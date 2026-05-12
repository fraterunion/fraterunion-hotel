import { Injectable, Logger } from '@nestjs/common';
import { HOTEL_FAQS } from './hotel-faqs';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class BotKnowledgeService {
  private readonly logger = new Logger(BotKnowledgeService.name);

  findMatch(message: string): string | null {
    const normalized = normalize(message);

    let bestAnswer: string | null = null;
    let bestScore = 0;

    for (const faq of HOTEL_FAQS) {
      let keywordMatches = 0;
      for (const keyword of faq.keywords) {
        if (normalized.includes(keyword)) {
          keywordMatches += 1;
        }
      }
      if (keywordMatches === 0) continue;

      const weighted = keywordMatches * (faq.priority ?? 1);
      if (weighted > bestScore) {
        bestScore = weighted;
        bestAnswer = faq.answer;
        this.logger.debug(`[FAQ] Candidate "${faq.id}" score=${weighted}`);
      }
    }

    if (bestAnswer) {
      this.logger.log(`[FAQ] Match found (score=${bestScore}) for: "${message.slice(0, 60)}"`);
    }

    return bestAnswer;
  }
}
