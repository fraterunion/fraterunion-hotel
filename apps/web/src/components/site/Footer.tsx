import Link from 'next/link';
import { hotelConfig } from '@fraterunion/config';

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOOKING_URL ?? '';

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[var(--lv-dark)]">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">

        {/* Three-column grid on large screens, stacked on mobile */}
        <div className="grid gap-12 sm:gap-14 lg:grid-cols-3 lg:gap-16">

          {/* Left — brand identity */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-[var(--lv-cream)]/35">
              {hotelConfig.hotelShortName}
            </p>
            <p className="mt-5 text-[1.05rem] font-light leading-[1.7] tracking-[-0.01em] text-[var(--lv-cream)]/70">
              Experiencias boutique<br />entre bosque y montaña.
            </p>
          </div>

          {/* Middle — location + hours */}
          <div className="space-y-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lv-cream)]/30">
                Ubicación
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--lv-cream)]/55">
                {hotelConfig.city}, {hotelConfig.region}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lv-cream)]/30">
                Horarios
              </p>
              <div className="mt-2.5 space-y-1 text-sm text-[var(--lv-cream)]/55">
                <p>Check-in · {hotelConfig.checkInTime}</p>
                <p>Check-out · {hotelConfig.checkOutTime}</p>
              </div>
            </div>
          </div>

          {/* Right — CTAs */}
          <div className="flex flex-col items-start gap-3">
            {WHATSAPP_URL && (
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1ebe5d]"
              >
                <WhatsAppIcon />
                Reservar por WhatsApp
              </a>
            )}
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.18] px-6 py-3 text-sm font-medium text-[var(--lv-cream)]/65 transition-all duration-200 hover:border-white/35 hover:text-[var(--lv-cream)]"
            >
              Ver cabañas
              <span aria-hidden className="text-xs">→</span>
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 border-t border-white/[0.05] pt-8">
          <p className="text-[11px] tracking-[0.09em] text-[var(--lv-cream)]/25">
            © 2026 Los Vagones. Todos los derechos reservados.
          </p>
        </div>

      </div>
    </footer>
  );
}
