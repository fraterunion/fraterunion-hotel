import Link from 'next/link';
import { hotelConfig, hotelLocationFull } from '@fraterunion/config';
import { bookingCopy } from '../content/booking-es';

export default function Page() {
  return (
    <main className="min-h-screen bg-[var(--cabin-bg)] text-[var(--cabin-ink)]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--cabin-olive)]">
          {hotelConfig.hotelShortName}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--cabin-forest-deep)]">
          {hotelConfig.heroTitle}
        </h1>
        <p className="mt-2 text-sm text-[var(--cabin-ink-soft)]">{hotelLocationFull()}</p>
        <p className="mt-6 text-base leading-relaxed text-[var(--cabin-ink-soft)]">
          {hotelConfig.heroSubtitle}
        </p>
        <Link
          href="/booking"
          className="mt-8 inline-flex rounded-2xl bg-[var(--cabin-terra)] px-5 py-3 text-sm font-medium text-[var(--cabin-elevated)] shadow-[0_6px_20px_rgba(192,89,61,0.25)] transition hover:bg-[var(--cabin-terra-hover)]"
        >
          {bookingCopy.home.bookCta}
        </Link>
      </div>
    </main>
  );
}
