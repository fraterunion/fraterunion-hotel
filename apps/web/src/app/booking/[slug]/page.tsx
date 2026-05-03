'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { hotelConfig } from '@fraterunion/config';
import {
  bookingCopy,
  formatGuestsLine,
  reservationStatusEs,
} from '../../../content/booking-es';

type Amenity = { name: string };
type Image = { url: string; altText: string | null };

type CabinType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number | string;
  capacityAdults: number;
  capacityChildren: number;
  bedType: string | null;
  sizeM2: number | null;
  images: Image[];
  amenities: Amenity[];
};

type ReservationResult = {
  id: string;
  reservationCode: string;
  status: string;
  paymentStatus: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: number | string;
  guest: { firstName: string; lastName: string; email: string };
  roomType: { name: string };
  hotel: { name: string; currency: string };
};

type Step = 'dates' | 'reserve' | 'success';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const CABIN_FALLBACK: Record<string, string> = {
  'casa-grande': '/images/los-vagones-hero.jpg',
  girasoles: '/images/los-vagones-hero.jpg',
  alcatraces: '/images/los-vagones-hero.jpg',
  'cabana-del-aguila': '/images/los-vagones-hero.jpg',
  'vagon-el-colorado': '/images/los-vagones-hero.jpg',
  'cabana-del-pozo': '/images/los-vagones-hero.jpg',
};

function cabinImage(slug: string, images: Image[]): string {
  return images[0]?.url ?? CABIN_FALLBACK[slug] ?? '/images/los-vagones-hero.jpg';
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateEs(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(Math.ceil((b - a) / 86400000), 0);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const inputCls =
  'w-full rounded-xl border border-[var(--cabin-border)] bg-[var(--cabin-bg)] px-4 py-3 text-sm text-[var(--cabin-ink)] placeholder-[var(--cabin-ink-faint)] outline-none ring-0 transition focus:border-[var(--cabin-forest)] focus:ring-2 focus:ring-[var(--cabin-forest)]/20';

const labelCls = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cabin-ink-faint)] mb-1.5';

const btnPrimary =
  'inline-flex w-full min-h-[52px] items-center justify-center rounded-2xl bg-[var(--cabin-terra)] px-8 text-sm font-semibold tracking-wide text-[var(--cabin-elevated)] shadow-[0_6px_22px_rgba(192,89,61,0.18)] transition duration-200 hover:-translate-y-px hover:bg-[var(--cabin-terra-hover)] hover:shadow-[0_14px_38px_rgba(192,89,61,0.26)] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none';

export default function CabinDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const [cabin, setCabin] = useState<CabinType | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingCabin, setLoadingCabin] = useState(true);

  // Booking state machine
  const [step, setStep] = useState<Step>('dates');

  // Dates step
  const [checkIn, setCheckIn] = useState(tomorrowStr());
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');

  // Reserve step
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reserveError, setReserveError] = useState('');

  // Success step
  const [reservation, setReservation] = useState<ReservationResult | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/public/catalog/${hotelConfig.defaultHotelSlug}`,
        );
        if (!res.ok) throw new Error();
        const data: CabinType[] = await res.json();
        const found = data.find((c) => c.slug === slug);
        if (!found) {
          setNotFound(true);
        } else {
          setCabin(found);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoadingCabin(false);
      }
    }
    load();
  }, [slug]);

  async function handleCheckAvailability(e: React.FormEvent) {
    e.preventDefault();
    if (!cabin) return;
    setAvailabilityError('');
    setCheckingAvailability(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public/availability/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelSlug: hotelConfig.defaultHotelSlug,
          checkInDate: checkIn,
          checkOutDate: checkOut,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const match = data.results?.find(
        (r: { id: string }) => r.id === cabin.id,
      );
      if (!match) {
        setAvailabilityError(bookingCopy.detail.unavailableMsg);
      } else {
        setStep('reserve');
      }
    } catch {
      setAvailabilityError(bookingCopy.errors.searchFallback);
    } finally {
      setCheckingAvailability(false);
    }
  }

  async function handleReserve(e: React.FormEvent) {
    e.preventDefault();
    if (!cabin) return;
    setReserveError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelSlug: hotelConfig.defaultHotelSlug,
          roomTypeId: cabin.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults,
          children,
          firstName,
          lastName,
          email,
          phone,
          country,
          specialRequests,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReservation(data.reservation);
      setStep('success');
    } catch {
      setReserveError(bookingCopy.errors.reserveFallback);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    if (!reservation) return;
    setPaying(true);
    setPayError('');
    try {
      const res = await fetch(`${API_BASE_URL}/public/payments/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: reservation.id }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      window.location.href = data.checkoutUrl;
    } catch {
      setPayError(bookingCopy.errors.paymentFallback);
      setPaying(false);
    }
  }

  const nights = nightsBetween(checkIn, checkOut);
  const estimatedTotal = cabin ? Number(cabin.basePrice) * Math.max(nights, 1) : 0;

  // ── Loading / not found ──────────────────────────────────────────────────────
  if (loadingCabin) {
    return (
      <main className="min-h-screen bg-[var(--lv-dark)] flex items-center justify-center">
        <p className="text-sm text-[var(--lv-cream)]/50">{bookingCopy.catalog.loading}</p>
      </main>
    );
  }

  if (notFound || !cabin) {
    return (
      <main className="min-h-screen bg-[var(--cabin-bg)] flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-base text-[var(--cabin-ink-soft)]">{bookingCopy.detail.notFound}</p>
        <Link
          href="/booking"
          className="text-sm font-semibold text-[var(--cabin-forest-deep)] underline-offset-4 hover:underline"
        >
          {bookingCopy.detail.notFoundCta}
        </Link>
      </main>
    );
  }

  const heroImg = cabinImage(cabin.slug, cabin.images);

  // ── Success step — full page ─────────────────────────────────────────────────
  if (step === 'success' && reservation) {
    return (
      <main className="min-h-screen bg-[var(--cabin-bg)] px-6 py-16 text-[var(--cabin-ink)] antialiased sm:py-20">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-[var(--cabin-cream)] shadow-[0_14px_48px_rgba(45,38,32,0.06)] ring-1 ring-[var(--cabin-border-soft)]">
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--cabin-forest)] via-[var(--cabin-terra)]/70 to-[var(--cabin-olive)]/80" />
          <div className="p-8 sm:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--cabin-olive)]">
              {hotelConfig.hotelShortName}
            </p>
            <div className="mt-4 inline-flex rounded-full bg-[var(--cabin-olive-soft)]/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--cabin-forest-deep)] ring-1 ring-[var(--cabin-border)]">
              {bookingCopy.success.badge}
            </div>

            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--cabin-forest-deep)] sm:text-4xl">
              {bookingCopy.success.thankYou(reservation.guest.firstName)}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-[var(--cabin-ink-soft)]">
              {bookingCopy.success.bodyBeforeStatus(reservation.hotel.name)}{' '}
              <span className="font-semibold text-[var(--cabin-forest-deep)]">
                {reservationStatusEs[reservation.status] ?? reservation.status}
              </span>
              {bookingCopy.success.bodyAfterStatus}
            </p>

            <dl className="mt-8 grid gap-4 rounded-xl bg-[var(--cabin-bg)] p-6 ring-1 ring-[var(--cabin-border-soft)] sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.success.reservationCode}
                </dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-[var(--cabin-ink)]">
                  {reservation.reservationCode}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.success.hotel}
                </dt>
                <dd className="mt-1 text-sm text-[var(--cabin-ink)]">{reservation.hotel.name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.success.roomType}
                </dt>
                <dd className="mt-1 text-sm text-[var(--cabin-ink)]">{reservation.roomType.name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.success.stay}
                </dt>
                <dd className="mt-1 text-sm text-[var(--cabin-ink)]">
                  {formatDateEs(reservation.checkInDate)} → {formatDateEs(reservation.checkOutDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.success.totalAmount}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--cabin-ink)]">
                  {formatCurrency(reservation.totalAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.success.paymentStatus}
                </dt>
                <dd className="mt-1 text-sm text-[var(--cabin-ink)]">
                  {reservation.paymentStatus}
                </dd>
              </div>
            </dl>

            <p className="mt-6 text-xs leading-relaxed text-[var(--cabin-ink-faint)]">
              {bookingCopy.success.supportLinePrefix} {hotelConfig.checkInTime}{' '}
              {bookingCopy.success.supportLineMiddle} {hotelConfig.checkOutTime}.{' '}
              {bookingCopy.success.supportLineSuffix}{' '}
              <a
                href={`mailto:${hotelConfig.supportEmail}`}
                className="font-medium text-[var(--cabin-forest-deep)] underline-offset-4 hover:underline"
              >
                {hotelConfig.supportEmail}
              </a>{' '}
              {bookingCopy.success.orCall} {hotelConfig.supportPhone}.
            </p>

            {payError && (
              <p className="mt-4 text-sm font-medium text-red-700">{payError}</p>
            )}

            <div className="mt-10 flex flex-col gap-3 border-t border-[var(--cabin-border-soft)] pt-10 sm:flex-row">
              <button
                onClick={handlePay}
                disabled={paying}
                className={btnPrimary + ' sm:w-auto sm:flex-none px-10'}
              >
                {paying ? bookingCopy.summary.creating : bookingCopy.success.proceedPay}
              </button>
              <Link
                href="/booking"
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-[var(--cabin-border)] bg-transparent px-8 text-sm font-medium text-[var(--cabin-ink)] transition hover:bg-[var(--cabin-bg-deep)] sm:w-auto"
              >
                {bookingCopy.success.anotherBooking}
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Main layout: detail + booking card ──────────────────────────────────────
  return (
    <main className="min-h-screen bg-[var(--cabin-bg)] antialiased">
      {/* Sticky top nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--cabin-border-soft)] bg-[var(--cabin-elevated)]/95 px-6 py-4 backdrop-blur-sm sm:px-10 lg:px-16">
        <Link
          href="/booking"
          className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--cabin-ink-faint)] transition-colors hover:text-[var(--cabin-ink)]"
        >
          <span>←</span>
          {bookingCopy.detail.backLabel}
        </Link>
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--cabin-ink-faint)]">
          {hotelConfig.hotelShortName}
        </span>
      </nav>

      {/* Hero image */}
      <div className="relative h-[56vh] min-h-[320px] overflow-hidden bg-[var(--lv-dark)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImg})` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--lv-dark)]/70 via-[var(--lv-dark)]/20 to-transparent"
          aria-hidden
        />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 sm:px-10 lg:px-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--cabin-terra)]">
            {bookingCopy.detail.cabinEyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-light tracking-tight text-[var(--lv-cream)] sm:text-5xl lg:text-6xl">
            {cabin.name}
          </h1>
          <p className="mt-2 text-lg font-semibold tabular-nums text-[var(--lv-cream)]/80">
            {formatCurrency(cabin.basePrice)}{' '}
            <span className="text-sm font-normal text-[var(--lv-cream)]/50">
              {bookingCopy.catalog.perNight}
            </span>
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 lg:grid lg:grid-cols-12 lg:gap-16 lg:px-16 lg:py-16">
        {/* Booking card — mobile: first; desktop: right col */}
        <aside className="mb-12 lg:sticky lg:top-24 lg:col-span-5 lg:col-start-8 lg:mb-0 lg:row-start-1 lg:self-start">
          <div className="overflow-hidden rounded-2xl bg-[var(--cabin-elevated)] shadow-[0_8px_40px_rgba(28,24,19,0.10)] ring-1 ring-[var(--cabin-border-soft)]">
            <div className="border-b border-[var(--cabin-border-soft)] px-7 py-5 sm:px-8">
              <h2 className="text-base font-semibold text-[var(--cabin-forest-deep)]">
                {bookingCopy.detail.bookingCardTitle}
              </h2>
            </div>

            <div className="px-7 py-6 sm:px-8">
              {/* Dates step */}
              {step === 'dates' && (
                <form onSubmit={handleCheckAvailability} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>{bookingCopy.search.arrival}</label>
                      <input
                        type="date"
                        className={inputCls}
                        value={checkIn}
                        min={todayStr()}
                        onChange={(e) => {
                          setCheckIn(e.target.value);
                          setAvailabilityError('');
                          if (e.target.value >= checkOut) {
                            const next = new Date(e.target.value);
                            next.setDate(next.getDate() + 1);
                            setCheckOut(next.toISOString().slice(0, 10));
                          }
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{bookingCopy.search.departure}</label>
                      <input
                        type="date"
                        className={inputCls}
                        value={checkOut}
                        min={checkIn}
                        onChange={(e) => {
                          setCheckOut(e.target.value);
                          setAvailabilityError('');
                        }}
                        required
                      />
                    </div>
                  </div>

                  {nights > 0 && (
                    <p className="text-xs text-[var(--cabin-ink-faint)]">
                      {nights === 1 ? '1 noche' : `${nights} noches`}{' '}
                      ·{' '}
                      <span className="font-semibold text-[var(--cabin-ink)]">
                        {formatCurrency(estimatedTotal)}
                      </span>{' '}
                      estimado
                    </p>
                  )}

                  {availabilityError && (
                    <p className="text-sm font-medium text-red-700">{availabilityError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={checkingAvailability || nights < 1}
                    className={btnPrimary}
                  >
                    {checkingAvailability
                      ? bookingCopy.detail.checking
                      : bookingCopy.detail.checkAvailability}
                  </button>

                  <p className="text-center text-[11px] text-[var(--cabin-ink-faint)]">
                    {bookingCopy.detail.noTaxNote}
                  </p>
                </form>
              )}

              {/* Reserve step */}
              {step === 'reserve' && (
                <form onSubmit={handleReserve} className="space-y-5">
                  {/* Locked dates summary */}
                  <div className="rounded-xl bg-[var(--cabin-bg)] p-4 ring-1 ring-[var(--cabin-border-soft)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cabin-ink-faint)]">
                          {bookingCopy.summary.dates}
                        </p>
                        <p className="mt-0.5 text-sm text-[var(--cabin-ink)]">
                          {formatDateEs(checkIn)} → {formatDateEs(checkOut)}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--cabin-ink-faint)]">
                          {nights === 1 ? '1 noche' : `${nights} noches`}{' '}
                          · {formatCurrency(estimatedTotal)} estimado
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('dates');
                          setAvailabilityError('');
                        }}
                        className="shrink-0 text-xs font-semibold text-[var(--cabin-forest-deep)] underline-offset-4 hover:underline"
                      >
                        {bookingCopy.detail.changeDates}
                      </button>
                    </div>
                  </div>

                  {/* Guest fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>{bookingCopy.guest.firstName}</label>
                      <input
                        className={inputCls}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        placeholder="Ana"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{bookingCopy.guest.lastName}</label>
                      <input
                        className={inputCls}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        placeholder="López"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{bookingCopy.guest.email}</label>
                    <input
                      type="email"
                      className={inputCls}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="ana@correo.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>{bookingCopy.guest.phone}</label>
                      <input
                        type="tel"
                        className={inputCls}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+52 55 0000 0000"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{bookingCopy.guest.country}</label>
                      <input
                        className={inputCls}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="México"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>{bookingCopy.guest.adults}</label>
                      <select
                        className={inputCls}
                        value={adults}
                        onChange={(e) => setAdults(Number(e.target.value))}
                      >
                        {Array.from({ length: cabin.capacityAdults }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{bookingCopy.guest.children}</label>
                      <select
                        className={inputCls}
                        value={children}
                        onChange={(e) => setChildren(Number(e.target.value))}
                      >
                        {Array.from({ length: cabin.capacityChildren + 1 }, (_, i) => i).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{bookingCopy.guest.specialRequests}</label>
                    <textarea
                      className={inputCls + ' resize-none'}
                      rows={3}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="Llegada tardía, alergias, celebración…"
                    />
                  </div>

                  {reserveError && (
                    <p className="text-sm font-medium text-red-700">{reserveError}</p>
                  )}

                  <button type="submit" disabled={submitting} className={btnPrimary}>
                    {submitting
                      ? bookingCopy.guest.creating
                      : bookingCopy.guest.completeCta}
                  </button>

                  <p className="text-center text-[11px] text-[var(--cabin-ink-faint)]">
                    {bookingCopy.detail.noTaxNote}
                  </p>
                </form>
              )}
            </div>
          </div>
        </aside>

        {/* Cabin info — mobile: second; desktop: left col */}
        <div className="lg:col-span-7 lg:col-start-1 lg:row-start-1">
          {/* Description */}
          {cabin.description && (
            <section className="mb-10">
              <p className="text-base leading-relaxed text-[var(--cabin-ink-soft)] sm:text-lg">
                {cabin.description}
              </p>
            </section>
          )}

          {/* Quick specs chips */}
          <div className="mb-10 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--cabin-olive-soft)] px-4 py-1.5 text-xs font-medium text-[var(--cabin-ink)] ring-1 ring-[var(--cabin-border)]">
              {bookingCopy.catalog.capacityLabel(cabin.capacityAdults)}
            </span>
            {cabin.bedType && (
              <span className="rounded-full bg-[var(--cabin-olive-soft)] px-4 py-1.5 text-xs font-medium text-[var(--cabin-ink)] ring-1 ring-[var(--cabin-border)]">
                {cabin.bedType}
              </span>
            )}
            {cabin.sizeM2 && (
              <span className="rounded-full bg-[var(--cabin-olive-soft)] px-4 py-1.5 text-xs font-medium text-[var(--cabin-ink)] ring-1 ring-[var(--cabin-border)]">
                {cabin.sizeM2} m²
              </span>
            )}
          </div>

          {/* Amenities */}
          {cabin.amenities.length > 0 && (
            <section>
              <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--cabin-ink-faint)]">
                {bookingCopy.detail.amenitiesTitle}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {cabin.amenities.map((a) => (
                  <li
                    key={a.name}
                    className="flex items-center gap-3 text-sm text-[var(--cabin-ink-soft)]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--cabin-terra)]" />
                    {a.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
