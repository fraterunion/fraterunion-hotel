import { GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

// 32 chars: uppercase A-Z minus I/O + digits 2-9 minus 0/1.
// 256 % 32 === 0 → no modulo bias when mapping random bytes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class CheckoutShortLinksService {
  private readonly logger = new Logger(CheckoutShortLinksService.name);
  private readonly enabled: boolean;
  private readonly webAppUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = configService.get<string>('SHORT_LINKS_ENABLED') === 'true';
    this.webAppUrl = configService.get<string>('WEB_APP_URL') ?? '';
    if (!this.enabled) {
      this.logger.log('[SHORT LINKS] disabled');
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  private generateCode(length: number): string {
    const bytes = randomBytes(length);
    return Array.from(bytes)
      .map((b) => ALPHABET[b % 32])
      .join('');
  }

  private async generateUniqueCode(): Promise<string> {
    // 32^6 = ~1 billion possibilities — collision is astronomically unlikely.
    // Retry loop is a pure safety net; escalate to 8 chars after 5 failures.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.generateCode(6);
      const existing = await this.prisma.checkoutShortLink.findUnique({ where: { code } });
      if (!existing) return code;
      this.logger.warn(`[SHORT LINKS] Code collision on attempt ${attempt + 1}: ${code}`);
    }
    const code = this.generateCode(8);
    const existing = await this.prisma.checkoutShortLink.findUnique({ where: { code } });
    if (!existing) return code;
    throw new Error('Failed to generate unique short code after 6 attempts');
  }

  async createShortLink(params: {
    hotelId: string;
    stripeUrl: string;
    reservationId?: string;
    paymentId?: string;
    expiresAt?: Date;
  }): Promise<string> {
    // Idempotency: reuse existing link for the same reservation if not expired.
    if (params.reservationId) {
      const existing = await this.prisma.checkoutShortLink.findUnique({
        where: { reservationId: params.reservationId },
      });
      if (existing) {
        const isExpired = existing.expiresAt && existing.expiresAt < new Date();
        if (!isExpired) {
          const shortUrl = `${this.webAppUrl}/p/${existing.code}`;
          this.logger.log(
            `[SHORT LINKS] Reusing existing code=${existing.code} reservationId=${params.reservationId}`,
          );
          return shortUrl;
        }
        // Expired: remove stale record so creation below succeeds on the unique constraint.
        await this.prisma.checkoutShortLink.delete({ where: { id: existing.id } });
        this.logger.log(
          `[SHORT LINKS] Deleted expired link for reservationId=${params.reservationId}, creating fresh`,
        );
      }
    }

    const code = await this.generateUniqueCode();

    await this.prisma.checkoutShortLink.create({
      data: {
        code,
        hotelId: params.hotelId,
        stripeUrl: params.stripeUrl,
        reservationId: params.reservationId,
        paymentId: params.paymentId,
        expiresAt: params.expiresAt,
      },
    });

    const shortUrl = `${this.webAppUrl}/p/${code}`;
    this.logger.log(
      `[SHORT LINKS] Created code=${code} reservationId=${params.reservationId ?? '(none)'} → ${shortUrl}`,
    );
    return shortUrl;
  }

  async resolveShortLink(code: string): Promise<{ stripeUrl: string; id: string }> {
    const link = await this.prisma.checkoutShortLink.findUnique({ where: { code } });

    if (!link) {
      throw new NotFoundException(`Short link not found: ${code}`);
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new GoneException(`Short link expired: ${code}`);
    }

    return { stripeUrl: link.stripeUrl, id: link.id };
  }

  async trackClick(id: string): Promise<void> {
    try {
      await this.prisma.checkoutShortLink.update({
        where: { id },
        data: {
          clickCount: { increment: 1 },
          lastClickedAt: new Date(),
        },
      });
      // TODO: emit CHECKOUT_LINK_CLICKED analytics event (bot analytics Phase 2)
    } catch (err: any) {
      this.logger.error(`[SHORT LINKS] trackClick failed id=${id}: ${err?.message}`);
    }
  }
}
