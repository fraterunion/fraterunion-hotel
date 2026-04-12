import Link from 'next/link';
import { hotelConfig } from '@fraterunion/config';
import { bookingCopy } from '../../../content/booking-es';

const btnPrimaryBase =
  'inline-flex min-h-14 items-center justify-center rounded-2xl bg-[var(--cabin-terra)] px-8 text-base font-semibold tracking-wide text-[var(--cabin-elevated)] shadow-[0_6px_22px_rgba(192,89,61,0.2)] transition duration-200 hover:-translate-y-px hover:bg-[var(--cabin-terra-hover)] hover:shadow-[0_14px_38px_rgba(192,89,61,0.28)] active:translate-y-0';

export default function BookingPaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-[var(--cabin-bg)] px-6 py-16 text-[var(--cabin-ink)] antialiased sm:py-20">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-[var(--cabin-cream)] shadow-[0_14px_48px_rgba(45,38,32,0.06)] ring-1 ring-[var(--cabin-border-soft)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--cabin-forest)] via-[var(--cabin-terra)]/70 to-[var(--cabin-olive)]/80" />
        <div className="p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--cabin-olive)]">
            {hotelConfig.hotelShortName}
          </p>
          <div className="mt-4 inline-flex rounded-full bg-[var(--cabin-olive-soft)]/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--cabin-forest-deep)] ring-1 ring-[var(--cabin-border)]">
            {bookingCopy.paymentSuccess.badge}
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--cabin-forest-deep)] sm:text-4xl">
            {bookingCopy.paymentSuccess.title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--cabin-ink-soft)]">
            {bookingCopy.paymentSuccess.body(hotelConfig.hotelName)}
          </p>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--cabin-ink-faint)]">
            {bookingCopy.paymentSuccess.times(
              hotelConfig.checkInTime,
              hotelConfig.checkOutTime,
            )}{' '}
            <a
              href={`mailto:${hotelConfig.supportEmail}`}
              className="font-medium text-[var(--cabin-forest-deep)] underline-offset-4 hover:underline"
            >
              {hotelConfig.supportEmail}
            </a>{' '}
            {bookingCopy.paymentSuccess.orAt} {hotelConfig.supportPhone}.
          </p>

          <div className="mt-10 border-t border-[var(--cabin-border-soft)] pt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cabin-olive)]">
              {bookingCopy.paymentSuccess.ctaSectionLabel}
            </p>
            <Link href="/booking" className={`${btnPrimaryBase} mt-4 w-full sm:w-auto`}>
              {bookingCopy.paymentSuccess.backToBooking}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
