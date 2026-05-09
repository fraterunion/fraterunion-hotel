import { hotelConfig } from '@fraterunion/config';

const LABEL = 'text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--lv-cream)]/30';
const BODY  = 'text-[10px] sm:text-[0.78rem] leading-[1.4] sm:leading-[1.45] text-[var(--lv-cream)]/58';

export function SiteFooter() {
  const phoneHref = `tel:${hotelConfig.supportPhone.replace(/\s/g, '')}`;
  const mailHref  = `mailto:${hotelConfig.supportEmail}`;

  return (
    <footer className="border-t border-white/[0.07] bg-[var(--lv-dark)]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-10 sm:py-8 lg:px-16 lg:py-10">

        {/* Three-column grid — all breakpoints */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 lg:gap-8">

          {/* ── Col 1 — Brand ── */}
          <div>
            <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.42em] text-[var(--lv-cream)]/35">
              {hotelConfig.hotelShortName}
            </p>
            <p className="mt-1.5 text-[10px] sm:mt-2 sm:text-[0.82rem] font-light leading-[1.4] sm:leading-[1.45] tracking-[-0.01em] text-[var(--lv-cream)]/68">
              Refugio privado entre bosque, montaña y silencio.
            </p>
          </div>

          {/* ── Col 2 — Location + Hours ── */}
          <div className="space-y-2 sm:space-y-3.5">

            <div>
              <p className={LABEL}>Ubicación</p>
              <div className={`mt-1 ${BODY}`}>
                <p>{hotelConfig.city}, {hotelConfig.region}</p>
                <p className="hidden sm:block text-[var(--lv-cream)]/38 text-[0.73rem]">
                  {hotelConfig.locationReference}
                </p>
              </div>
            </div>

            <div className="hidden sm:block">
              <p className={LABEL}>Dirección</p>
              <p className={`mt-1 ${BODY}`}>{hotelConfig.address}</p>
            </div>

            <div>
              <p className={LABEL}>Horarios</p>
              <div className={`mt-1 ${BODY}`}>
                <p>Check-in · {hotelConfig.checkInTime}</p>
                <p>Check-out · {hotelConfig.checkOutTime}</p>
              </div>
            </div>

          </div>

          {/* ── Col 3 — Contact ── */}
          <div>
            <p className={LABEL}>Contacto</p>
            <div className={`mt-1 ${BODY}`}>
              <a
                href={phoneHref}
                className="block transition-colors duration-150 hover:text-[var(--lv-cream)]"
              >
                {hotelConfig.supportPhone}
              </a>
              <a
                href={mailHref}
                className="block break-all transition-colors duration-150 hover:text-[var(--lv-cream)]"
              >
                {hotelConfig.supportEmail}
              </a>
            </div>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-4 border-t border-white/[0.06] pt-3 sm:mt-5 sm:pt-4">
          <p className="text-[8px] sm:text-[9px] tracking-[0.1em] text-[var(--lv-cream)]/22">
            © 2026 {hotelConfig.hotelName}. Todos los derechos reservados.
          </p>
        </div>

      </div>
    </footer>
  );
}
