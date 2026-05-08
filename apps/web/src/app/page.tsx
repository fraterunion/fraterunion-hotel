import Link from 'next/link';
import { hotelConfig, hotelLocationLine } from '@fraterunion/config';

export default function Page() {
  return (
    <main className="relative bg-[var(--lv-dark)]">
      {/* Minimal top nav */}
      <nav className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-7 sm:px-10 lg:px-16">
        <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--lv-cream)]/70">
          {hotelConfig.hotelShortName}
        </span>
        <Link
          href="/booking"
          className="rounded-full border border-white/20 px-5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--lv-cream)]/75 transition-all duration-200 hover:border-white/45 hover:text-[var(--lv-cream)]"
        >
          Reservar
        </Link>
      </nav>

      {/* Full-viewport cinematic hero */}
      <section className="relative flex min-h-[100svh] items-end">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/los-vagones-hero.jpg)' }}
          aria-hidden
        />
        {/* Cinematic overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--lv-dark)] via-[var(--lv-dark)]/62 to-[var(--lv-dark)]/22"
          aria-hidden
        />
        {/* Left-side depth vignette */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[var(--lv-dark)]/52 via-transparent to-transparent"
          aria-hidden
        />
        {/* Subtle film grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.038]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '300px 300px',
          }}
          aria-hidden
        />

        {/* Editorial content — anchored to bottom */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 sm:px-10 sm:pb-24 lg:px-16 lg:pb-32">

          {/* Location eyebrow */}
          <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[var(--cabin-terra)]">
            {hotelLocationLine()} · México
          </p>

          {/* Main headline */}
          <h1 className="mt-6 max-w-[13ch] text-[2.55rem] font-light leading-[1.07] tracking-[-0.01em] text-[var(--lv-cream)] sm:text-5xl lg:max-w-2xl lg:text-6xl">
            {hotelConfig.heroTitle}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-[28ch] text-sm leading-[1.75] text-[var(--lv-cream)]/50 sm:text-base">
            {hotelConfig.heroSubtitle}
          </p>

          {/* CTAs */}
          <div className="mt-11 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">

            {/* Primary */}
            <Link
              href="/booking"
              className="inline-flex items-center justify-center rounded-full bg-[var(--cabin-terra)] px-8 py-[14px] text-sm font-semibold tracking-wide text-[var(--lv-cream)] transition-colors duration-200 hover:bg-[var(--cabin-terra-hover)] sm:w-auto"
            >
              {hotelConfig.heroCta}
            </Link>

            {/* Secondary — concierge WhatsApp */}
            {process.env.NEXT_PUBLIC_WHATSAPP_BOOKING_URL && (
              <a
                href={process.env.NEXT_PUBLIC_WHATSAPP_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#22c55e] px-8 py-[14px] text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-[#16a34a] sm:w-auto"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Reservar por WhatsApp
              </a>
            )}
          </div>

          {/* Trust indicator */}
          <p className="mt-7 text-[10px] tracking-[0.15em] text-[var(--lv-cream)]/28">
            La experiencia mejor valorada en La Marquesa
          </p>

        </div>
      </section>
    </main>
  );
}
