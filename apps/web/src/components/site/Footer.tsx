import Link from 'next/link';
import { hotelConfig } from '@fraterunion/config';

const LABEL = 'text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--lv-cream)]/32';
const BODY  = 'text-[0.82rem] leading-[1.55] text-[var(--lv-cream)]/62';

export function SiteFooter() {
  const phoneHref = `tel:${hotelConfig.supportPhone.replace(/\s/g, '')}`;
  const mailHref  = `mailto:${hotelConfig.supportEmail}`;

  return (
    <footer className="border-t border-white/[0.07] bg-[var(--lv-dark)]">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10 sm:py-12 lg:px-16 lg:py-14">

        {/* Three-column grid */}
        <div className="grid gap-7 sm:gap-9 lg:grid-cols-3 lg:gap-10">

          {/* ── Col 1 — Brand ─────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[var(--lv-cream)]/38">
              {hotelConfig.hotelShortName}
            </p>
            <p className="mt-3 max-w-[22ch] text-[0.875rem] font-light leading-[1.55] tracking-[-0.01em] text-[var(--lv-cream)]/72">
              Refugio privado entre bosque,<br />montaña y silencio.
            </p>
          </div>

          {/* ── Col 2 — Location + Hours ──────────────────────────────── */}
          <div className="space-y-5">

            <div>
              <p className={LABEL}>Ubicación</p>
              <div className={`mt-1.5 ${BODY}`}>
                <p>{hotelConfig.city}, {hotelConfig.region}</p>
                <p className="mt-0.5 text-[var(--lv-cream)]/40 text-[0.78rem]">
                  {hotelConfig.locationReference}
                </p>
              </div>
            </div>

            <div>
              <p className={LABEL}>Dirección</p>
              <p className={`mt-1.5 ${BODY}`}>
                {hotelConfig.address}
              </p>
            </div>

            <div>
              <p className={LABEL}>Horarios</p>
              <div className={`mt-1.5 space-y-0.5 ${BODY}`}>
                <p>Check-in&nbsp;&nbsp;· {hotelConfig.checkInTime}</p>
                <p>Check-out · {hotelConfig.checkOutTime}</p>
              </div>
            </div>

          </div>

          {/* ── Col 3 — Contact + CTAs ────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            <div>
              <p className={LABEL}>Contacto</p>
              <div className={`mt-1.5 space-y-0.5 ${BODY}`}>
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

            {/* CTA */}
            <Link
              href="/booking"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/[0.36] px-5 py-2 text-[0.8rem] font-medium text-[var(--lv-cream)]/82 transition-all duration-200 hover:border-white/55 hover:text-[var(--lv-cream)] sm:w-auto sm:justify-start"
            >
              Ver cabañas
              <span aria-hidden className="text-xs">→</span>
            </Link>

          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────── */}
        <div className="mt-8 border-t border-white/[0.06] pt-5">
          <p className="text-[10px] tracking-[0.1em] text-[var(--lv-cream)]/25">
            © 2026 {hotelConfig.hotelName}. Todos los derechos reservados.
          </p>
        </div>

      </div>
    </footer>
  );
}
