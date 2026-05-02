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

          {/* Primary CTA */}
          <Link
            href="/booking"
            className="mt-10 inline-flex min-h-[52px] items-center rounded-full bg-[var(--cabin-terra)] px-9 text-sm font-semibold tracking-wide text-[var(--lv-cream)] shadow-[0_14px_44px_rgba(176,68,48,0.50)] transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-[var(--cabin-terra-hover)] hover:shadow-[0_22px_60px_rgba(176,68,48,0.60)]"
          >
            {bookingCopy.home.bookCta}
          </Link>

          {/* Location fine print */}
          <p className="mt-8 text-xs text-[var(--lv-cream)]/38">
            {hotelLocationFull()}
          </p>
        </div>
      </section>
    </main>
  );
}
