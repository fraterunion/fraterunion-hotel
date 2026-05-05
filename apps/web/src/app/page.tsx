import Link from 'next/link';
import { hotelConfig, hotelLocationFull, hotelLocationLine } from '@fraterunion/config';
import { bookingCopy } from '../content/booking-es';

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
      <section className="relative flex min-h-screen items-end">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/los-vagones-hero.jpg)' }}
          aria-hidden
        />
        {/* Primary dark gradient — heavy at bottom where text lives */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--lv-dark)]/95 via-[var(--lv-dark)]/48 to-[var(--lv-dark)]/18"
          aria-hidden
        />
        {/* Subtle side vignette for depth */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[var(--lv-dark)]/40 via-transparent to-transparent"
          aria-hidden
        />

        {/* Editorial content — anchored to bottom-left */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 sm:px-10 sm:pb-28 lg:px-16 lg:pb-36">
          {/* Property eyebrow */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[var(--cabin-terra)]">
            {hotelLocationLine()} · México
          </p>

          {/* Main editorial headline */}
          <h1 className="mt-5 max-w-4xl text-5xl font-light leading-[1.06] tracking-tight text-[var(--lv-cream)] sm:text-6xl lg:text-7xl">
            {hotelConfig.heroTitle}
          </h1>

          {/* Subheadline */}
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--lv-cream)]/65 sm:text-lg">
            {hotelConfig.heroSubtitle}
          </p>

          {/* Info chips — dark glass */}
          <div className="mt-9 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center rounded-full border border-white/14 bg-white/7 px-4 py-2 text-xs font-medium text-[var(--lv-cream)]/75 backdrop-blur-sm">
              {bookingCopy.hero.checkIn} {hotelConfig.checkInTime}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/14 bg-white/7 px-4 py-2 text-xs font-medium text-[var(--lv-cream)]/75 backdrop-blur-sm">
              {bookingCopy.hero.checkOut} {hotelConfig.checkOutTime}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/14 bg-white/7 px-4 py-2 text-xs font-medium text-[var(--lv-cream)]/55 backdrop-blur-sm">
              {hotelConfig.locationReference}
            </span>
          </div>

          {/* Primary CTA + optional WhatsApp secondary */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/booking"
              className="inline-flex min-h-[52px] items-center rounded-full bg-[var(--cabin-terra)] px-9 text-sm font-semibold tracking-wide text-[var(--lv-cream)] shadow-[0_14px_44px_rgba(176,68,48,0.50)] transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-[var(--cabin-terra-hover)] hover:shadow-[0_22px_60px_rgba(176,68,48,0.60)]"
            >
              {bookingCopy.home.bookCta}
            </Link>
            {process.env.NEXT_PUBLIC_WHATSAPP_BOOKING_URL && (
              <a
                href={process.env.NEXT_PUBLIC_WHATSAPP_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-[#25D366] px-8 text-sm font-semibold tracking-wide text-white shadow-[0_8px_28px_rgba(37,211,102,0.35)] transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-[#1ebe5d] hover:shadow-[0_14px_40px_rgba(37,211,102,0.45)]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Reservar por WhatsApp 💬
              </a>
            )}
          </div>

          {/* Location fine print */}
          <p className="mt-8 text-xs text-[var(--lv-cream)]/38">
            {hotelLocationFull()}
          </p>
        </div>
      </section>
    </main>
  );
}
