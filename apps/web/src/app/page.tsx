import Link from 'next/link';
import { hotelConfig, hotelLocationFull } from '@fraterunion/config';
import { bookingCopy } from '../content/booking-es';

export default function Page() {
  return (
    <main className="min-h-screen bg-transparent text-[var(--cabin-ink)]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--cabin-olive)]">
          {hotelConfig.hotelShortName}
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-[var(--cabin-forest-deep)]">
          {hotelConfig.heroTitle}
        </h1>
        <p className="mt-6 text-sm text-[var(--cabin-ink-soft)]">{hotelLocationFull()}</p>
        <p className="mt-6 text-base leading-relaxed text-[var(--cabin-ink-soft)]">
          {hotelConfig.heroSubtitle}
        </p>
        <Link
          href="/booking"
          className="mt-8 inline-flex min-h-14 items-center rounded-2xl bg-[var(--cabin-terra)] px-6 py-3 text-sm font-semibold text-[var(--cabin-elevated)] shadow-[0_10px_30px_rgba(176,68,48,0.35)] transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-[var(--cabin-terra-hover)] hover:shadow-[0_18px_50px_rgba(176,68,48,0.45)]"
        >
          {bookingCopy.home.bookCta}
        </Link>
      </div>
    </main>
  );
}
