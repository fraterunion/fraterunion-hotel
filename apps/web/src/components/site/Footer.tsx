import Link from 'next/link';
import { hotelConfig } from '@fraterunion/config';

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOOKING_URL ?? '';

const LABEL = 'text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--lv-cream)]/32';
const BODY  = 'text-[0.84rem] leading-[1.65] text-[var(--lv-cream)]/62';

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function SiteFooter() {
  const phoneHref = `tel:${hotelConfig.supportPhone.replace(/\s/g, '')}`;
  const mailHref  = `mailto:${hotelConfig.supportEmail}`;

  return (
    <footer className="border-t border-white/[0.07] bg-[var(--lv-dark)]">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-18">

        {/* Three-column grid */}
        <div className="grid gap-10 sm:gap-12 lg:grid-cols-3 lg:gap-14">

          {/* ── Col 1 — Brand ─────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[var(--lv-cream)]/38">
              {hotelConfig.hotelShortName}
            </p>
            <p className="mt-4 max-w-[22ch] text-[0.95rem] font-light leading-[1.65] tracking-[-0.01em] text-[var(--lv-cream)]/72">
              Refugio privado entre bosque,<br />montaña y silencio.
            </p>
          </div>

          {/* ── Col 2 — Location + Hours ──────────────────────────────── */}
          <div className="space-y-6">

            <div>
              <p className={LABEL}>Ubicación</p>
              <div className={`mt-2 ${BODY}`}>
                <p>{hotelConfig.city}, {hotelConfig.region}</p>
                <p className="mt-0.5 text-[var(--lv-cream)]/42 text-[0.8rem]">
                  {hotelConfig.locationReference}
                </p>
              </div>
            </div>

            <div>
              <p className={LABEL}>Dirección</p>
              <p className={`mt-2 ${BODY}`}>
                {hotelConfig.address}
              </p>
            </div>

            <div>
              <p className={LABEL}>Horarios</p>
              <div className={`mt-2 space-y-0.5 ${BODY}`}>
                <p>Check-in&nbsp;&nbsp;· {hotelConfig.checkInTime}</p>
                <p>Check-out · {hotelConfig.checkOutTime}</p>
              </div>
            </div>

          </div>

          {/* ── Col 3 — Contact + CTAs ────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            <div>
              <p className={LABEL}>Contacto</p>
              <div className={`mt-2 space-y-1 ${BODY}`}>
                <a
                  href={phoneHref}
                  className="block transition-colors duration-150 hover:text-[var(--lv-cream)]"
                >
                  {hotelConfig.supportPhone}
                </a>
                <a
                  href={mailHref}
                  className="block transition-colors duration-150 hover:text-[var(--lv-cream)]"
                >
                  {hotelConfig.supportEmail}
                </a>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              {WHATSAPP_URL && (
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1ebe5d] sm:w-auto sm:justify-start"
                >
                  <WhatsAppIcon />
                  Reservar por WhatsApp
                </a>
              )}
              <Link
                href="/booking"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.28] px-6 py-2.5 text-sm font-medium text-[var(--lv-cream)]/75 transition-all duration-200 hover:border-white/50 hover:text-[var(--lv-cream)] sm:w-auto sm:justify-start"
              >
                Ver cabañas
                <span aria-hidden className="text-xs opacity-70">→</span>
              </Link>
            </div>

          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────── */}
        <div className="mt-12 border-t border-white/[0.06] pt-6">
          <p className="text-[11px] tracking-[0.1em] text-[var(--lv-cream)]/28">
            © 2026 {hotelConfig.hotelName}. Todos los derechos reservados.
          </p>
        </div>

      </div>
    </footer>
  );
}
