'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { hotelConfig } from '@fraterunion/config';
import { bookingCopy, reservationStatusEs } from '../../../content/booking-es';
import { BookingCalendar } from '../../../components/BookingCalendar';

type Amenity = { name: string };
type CabinImage = { url: string; altText: string | null };

type CabinType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number | string;
  lowOccupancyPrice: number | string | null;
  lowOccupancyThreshold: number | null;
  capacityAdults: number;
  capacityChildren: number;
  bedType: string | null;
  sizeM2: number | null;
  images: CabinImage[];
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

const WHATSAPP_BOOKING_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOOKING_URL ?? '';

function buildCabinWhatsAppUrl(cabinName: string): string {
  if (!WHATSAPP_BOOKING_URL) return '';
  try {
    const url = new URL(WHATSAPP_BOOKING_URL);
    url.searchParams.set('text', `Hola, quiero reservar en ${cabinName}`);
    return url.toString();
  } catch {
    return WHATSAPP_BOOKING_URL;
  }
}

function buildGalleryPaths(slug: string): string[] {
  return [
    `/images/cabins/${slug}/hero.jpg`,
    `/images/cabins/${slug}/gallery-01.jpg`,
    `/images/cabins/${slug}/gallery-02.jpg`,
    `/images/cabins/${slug}/gallery-03.jpg`,
    `/images/cabins/${slug}/gallery-04.jpg`,
    `/images/cabins/${slug}/gallery-05.jpg`,
    `/images/cabins/${slug}/gallery-06.jpg`,
    `/images/cabins/${slug}/gallery-07.jpg`,
  ];
}

async function probeImages(paths: string[]): Promise<string[]> {
  const results = await Promise.all(
    paths.map(
      (path) =>
        new Promise<string | null>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve(path);
          img.onerror = () => resolve(null);
          img.src = path;
        }),
    ),
  );
  return results.filter((r): r is string => r !== null);
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


const inputCls =
  'w-full rounded-xl border border-[var(--cabin-border)] bg-[var(--cabin-bg)] px-4 py-3.5 text-sm text-[var(--cabin-ink)] placeholder-[var(--cabin-ink-faint)] outline-none transition focus:border-[var(--cabin-forest)] focus:ring-2 focus:ring-[var(--cabin-forest)]/20';

const labelCls =
  'block text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--cabin-ink-faint)] mb-2';

const btnPrimary =
  'inline-flex w-full min-h-[56px] items-center justify-center rounded-2xl bg-[var(--cabin-terra)] px-8 text-sm font-semibold tracking-wide text-[var(--cabin-elevated)] shadow-[0_6px_22px_rgba(192,89,61,0.2)] transition duration-200 hover:-translate-y-px hover:bg-[var(--cabin-terra-hover)] hover:shadow-[0_16px_40px_rgba(192,89,61,0.28)] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none';

export default function CabinDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const [cabin, setCabin] = useState<CabinType | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingCabin, setLoadingCabin] = useState(true);

  // Gallery state
  const [gallery, setGallery] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [imgFadingOut, setImgFadingOut] = useState(false);

  // Booking step
  const [step, setStep] = useState<Step>('dates');

  // Dates
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');

  // Guest fields
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

  // Payment
  const [reservation, setReservation] = useState<ReservationResult | null>(
    null,
  );
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

  useEffect(() => {
    if (!cabin) return;
    if (cabin.images.length > 0) {
      const dbImages = cabin.images.map((img) => img.url);
      setGallery(dbImages);
      setSelectedImage(dbImages[0]);
    } else {
      probeImages(buildGalleryPaths(cabin.slug)).then((valid) => {
        const result =
          valid.length > 0 ? valid : ['/images/los-vagones-hero.jpg'];
        setGallery(result);
        setSelectedImage(result[0]);
      });
    }
  }, [cabin]);

  function selectThumbnail(src: string) {
    if (src === selectedImage) return;
    setImgFadingOut(true);
    setTimeout(() => {
      setSelectedImage(src);
      setImgFadingOut(false);
    }, 180);
  }

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
      const res = await fetch(
        `${API_BASE_URL}/public/payments/checkout-session`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: reservation.id }),
        },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      window.location.href = data.checkoutUrl;
    } catch {
      setPayError(bookingCopy.errors.paymentFallback);
      setPaying(false);
    }
  }

  const nights = nightsBetween(checkIn, checkOut);
  const totalOccupants = adults + children;
  const nightlyRate = cabin
    ? cabin.lowOccupancyPrice != null &&
      cabin.lowOccupancyThreshold != null &&
      totalOccupants <= cabin.lowOccupancyThreshold
      ? Number(cabin.lowOccupancyPrice)
      : Number(cabin.basePrice)
    : 0;
  const estimatedTotal = nightlyRate * Math.max(nights, 1);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loadingCabin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--lv-dark)]">
        <p className="text-sm text-[var(--lv-cream)]/50">
          {bookingCopy.catalog.loading}
        </p>
      </main>
    );
  }

  if (notFound || !cabin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--cabin-bg)] px-6">
        <p className="text-base text-[var(--cabin-ink-soft)]">
          {bookingCopy.detail.notFound}
        </p>
        <Link
          href="/booking"
          className="text-sm font-semibold text-[var(--cabin-forest-deep)] underline-offset-4 hover:underline"
        >
          {bookingCopy.detail.notFoundCta}
        </Link>
      </main>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (step === 'success' && reservation) {
    return (
      <main className="min-h-screen bg-[var(--cabin-bg)] px-6 py-16 text-[var(--cabin-ink)] antialiased sm:py-20">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-[var(--cabin-cream)] shadow-[0_20px_64px_rgba(45,38,32,0.08)]">
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--cabin-forest)] via-[var(--cabin-terra)]/70 to-[var(--cabin-olive)]/80" />
          <div className="p-8 sm:p-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--cabin-olive)]">
              {hotelConfig.hotelShortName}
            </p>
            <div className="mt-4 inline-flex rounded-full bg-[var(--cabin-olive-soft)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--cabin-forest-deep)]">
              {bookingCopy.success.badge}
            </div>

            <h1 className="mt-6 text-3xl font-light tracking-tight text-[var(--cabin-forest-deep)] sm:text-4xl">
              {bookingCopy.success.thankYou(reservation.guest.firstName)}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-[var(--cabin-ink-soft)]">
              {bookingCopy.success.bodyBeforeStatus(reservation.hotel.name)}{' '}
              <span className="font-semibold text-[var(--cabin-forest-deep)]">
                {reservationStatusEs[reservation.status] ?? reservation.status}
              </span>
              {bookingCopy.success.bodyAfterStatus}
            </p>

            {/* Reservation code — hero element */}
            <div className="mt-8 rounded-2xl bg-[var(--cabin-forest-deep)] px-7 py-5 sm:px-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lv-cream)]/50">
                {bookingCopy.success.reservationCode}
              </p>
              <p className="mt-1.5 font-mono text-2xl font-semibold tracking-wider text-[var(--lv-cream)]">
                {reservation.reservationCode}
              </p>
            </div>

            {/* Detail grid */}
            <dl className="mt-6 grid gap-x-8 gap-y-5 rounded-2xl bg-[var(--cabin-bg)] p-6 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.success.hotel}
                </dt>
                <dd className="mt-1 text-sm text-[var(--cabin-ink)]">
                  {reservation.hotel.name}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.success.roomType}
                </dt>
                <dd className="mt-1 text-sm text-[var(--cabin-ink)]">
                  {reservation.roomType.name}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.success.stay}
                </dt>
                <dd className="mt-1 text-sm text-[var(--cabin-ink)]">
                  {formatDateEs(reservation.checkInDate)} →{' '}
                  {formatDateEs(reservation.checkOutDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.success.totalAmount}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--cabin-ink)]">
                  {formatCurrency(reservation.totalAmount)}
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
                className={`${btnPrimary} sm:w-auto sm:flex-none sm:px-12`}
              >
                {paying
                  ? bookingCopy.summary.creating
                  : bookingCopy.success.proceedPay}
              </button>
              <Link
                href="/booking"
                className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-[var(--cabin-border)] bg-transparent px-8 text-sm font-medium text-[var(--cabin-ink)] transition hover:bg-[var(--cabin-bg-deep)] sm:w-auto"
              >
                {bookingCopy.success.anotherBooking}
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Main detail layout ───────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[var(--cabin-bg)] antialiased">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--cabin-border-soft)] bg-[var(--cabin-elevated)]/95 px-6 py-4 backdrop-blur-sm sm:px-10 lg:px-16">
        <Link
          href="/booking"
          className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--cabin-ink-faint)] transition-colors hover:text-[var(--cabin-ink)]"
        >
          <span aria-hidden>←</span>
          {bookingCopy.detail.backLabel}
        </Link>
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--cabin-ink-faint)]">
          {hotelConfig.hotelShortName}
        </span>
      </nav>

      {/* Hero — 70vh desktop / full height mobile */}
      <div className="relative h-[100svh] overflow-hidden bg-[var(--lv-dark)] lg:h-[70vh]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${selectedImage})`,
            opacity: imgFadingOut ? 0 : 1,
            transition: 'opacity 180ms ease-out',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--lv-dark)]/80 via-[var(--lv-dark)]/25 to-transparent"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[var(--lv-dark)]/30 via-transparent to-transparent"
          aria-hidden
        />

        {/* Text overlay — bottom left */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 sm:px-10 lg:px-16 lg:pb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[var(--cabin-terra)]">
            {bookingCopy.detail.cabinEyebrow}
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-light leading-[1.08] tracking-tight text-[var(--lv-cream)] sm:text-5xl lg:text-6xl">
            {cabin.name}
          </h1>
          <p className="mt-3 text-xl font-semibold tabular-nums text-[var(--lv-cream)]/85">
            {cabin.lowOccupancyPrice
              ? `Desde ${formatCurrency(cabin.lowOccupancyPrice)}`
              : formatCurrency(cabin.basePrice)}{' '}
            <span className="text-sm font-normal text-[var(--lv-cream)]/50">
              {bookingCopy.catalog.perNight}
            </span>
          </p>
        </div>
      </div>

      {/* Gallery thumbnail strip */}
      {gallery.length > 1 && (
        <div className="bg-[var(--lv-dark)] px-6 pb-6 pt-4 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            {/* Counter */}
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lv-cream)]/35">
              {gallery.indexOf(selectedImage) + 1} / {gallery.length}
            </p>
            {/* Thumbnail row */}
            <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
              {gallery.map((src, i) => {
                const isSelected = selectedImage === src;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectThumbnail(src)}
                    aria-label={`Foto ${i + 1}`}
                    className="shrink-0 overflow-hidden rounded-xl transition-all duration-300"
                    style={{
                      height: 96,
                      width: 144,
                      backgroundImage: `url(${src})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: isSelected ? 1 : 0.45,
                      boxShadow: isSelected
                        ? '0 0 0 2px var(--cabin-terra), 0 0 0 4px rgba(176,68,48,0.25)'
                        : 'none',
                      transform: isSelected ? 'scale(1)' : 'scale(0.97)',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Two-column content */}
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:grid lg:grid-cols-12 lg:gap-16 lg:px-16 lg:py-16">
        {/* Booking card — mobile first, desktop right col */}
        <aside className="mb-14 lg:sticky lg:top-24 lg:col-span-5 lg:col-start-8 lg:mb-0 lg:row-start-1 lg:self-start">
          <div className="overflow-hidden rounded-3xl bg-[var(--cabin-elevated)] shadow-[0_16px_56px_rgba(28,24,19,0.12)]">
            {/* Card header */}
            <div className="border-b border-[var(--cabin-border-soft)] px-7 py-5 sm:px-8">
              <h2 className="text-sm font-semibold tracking-wide text-[var(--cabin-forest-deep)]">
                {bookingCopy.detail.bookingCardTitle}
              </h2>
            </div>

            <div className="px-7 py-7 sm:px-8">
              {/* ── Dates step ── */}
              {step === 'dates' && (
                <form onSubmit={handleCheckAvailability} className="space-y-5">
                  <BookingCalendar
                    hotelSlug={hotelConfig.defaultHotelSlug}
                    roomTypeSlug={cabin.slug}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onCheckInChange={(v) => {
                      setCheckIn(v);
                      setAvailabilityError('');
                    }}
                    onCheckOutChange={(v) => {
                      setCheckOut(v);
                      setAvailabilityError('');
                    }}
                  />

                  {nights > 0 && (
                    <div className="rounded-xl bg-[var(--cabin-bg)] px-4 py-3">
                      <p className="text-xs text-[var(--cabin-ink-faint)]">
                        {nights === 1 ? '1 noche' : `${nights} noches`}
                      </p>
                      <p className="mt-0.5 text-base font-semibold tabular-nums text-[var(--cabin-ink)]">
                        {formatCurrency(estimatedTotal)}{' '}
                        <span className="text-xs font-normal text-[var(--cabin-ink-faint)]">
                          estimado
                        </span>
                      </p>
                    </div>
                  )}

                  {availabilityError && (
                    <p className="text-sm font-medium text-red-700">
                      {availabilityError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={checkingAvailability || !checkIn || !checkOut || nights < 1}
                    className={btnPrimary}
                  >
                    {checkingAvailability
                      ? bookingCopy.detail.checking
                      : bookingCopy.detail.checkAvailability}
                  </button>

                  {WHATSAPP_BOOKING_URL && (
                  <div className="text-center">
                    <a
                      href={buildCabinWhatsAppUrl(cabin.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] text-[var(--cabin-ink-faint)] transition-colors hover:text-[#25D366]"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      o escríbenos por WhatsApp
                    </a>
                  </div>
                  )}

                  <p className="text-center text-[11px] text-[var(--cabin-ink-faint)]">
                    {bookingCopy.detail.noTaxNote}
                  </p>
                </form>
              )}

              {/* ── Reserve step ── */}
              {step === 'reserve' && (
                <form onSubmit={handleReserve} className="space-y-5">
                  {/* Locked dates */}
                  <div className="rounded-xl bg-[var(--cabin-bg)] px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cabin-ink-faint)]">
                          {bookingCopy.summary.dates}
                        </p>
                        <p className="mt-1 text-sm text-[var(--cabin-ink)]">
                          {formatDateEs(checkIn)} → {formatDateEs(checkOut)}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--cabin-ink-faint)]">
                          {nights === 1 ? '1 noche' : `${nights} noches`} ·{' '}
                          {formatCurrency(estimatedTotal)} estimado
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('dates');
                          setAvailabilityError('');
                        }}
                        className="shrink-0 text-[11px] font-semibold text-[var(--cabin-forest-deep)] underline-offset-4 hover:underline"
                      >
                        {bookingCopy.detail.changeDates}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>
                        {bookingCopy.guest.firstName}
                      </label>
                      <input
                        className={inputCls}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        placeholder="Ana"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        {bookingCopy.guest.lastName}
                      </label>
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>
                        {bookingCopy.guest.phone}
                      </label>
                      <input
                        type="tel"
                        className={inputCls}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+52 55 0000 0000"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        {bookingCopy.guest.country}
                      </label>
                      <input
                        className={inputCls}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="México"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>
                        {bookingCopy.guest.adults}
                      </label>
                      <select
                        className={inputCls}
                        value={adults}
                        onChange={(e) => setAdults(Number(e.target.value))}
                      >
                        {Array.from(
                          { length: cabin.capacityAdults },
                          (_, i) => i + 1,
                        ).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>
                        {bookingCopy.guest.children}
                      </label>
                      <select
                        className={inputCls}
                        value={children}
                        onChange={(e) => setChildren(Number(e.target.value))}
                      >
                        {Array.from(
                          { length: cabin.capacityChildren + 1 },
                          (_, i) => i,
                        ).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>
                      {bookingCopy.guest.specialRequests}
                    </label>
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={3}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="Llegada tardía, alergias, celebración…"
                    />
                  </div>

                  {reserveError && (
                    <p className="text-sm font-medium text-red-700">
                      {reserveError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className={btnPrimary}
                  >
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

        {/* Cabin info — mobile second, desktop left col */}
        <div className="space-y-12 lg:col-span-7 lg:col-start-1 lg:row-start-1">
          {/* La experiencia */}
          {cabin.description && (
            <section>
              <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--cabin-ink-faint)]">
                {bookingCopy.detail.experienceTitle}
              </p>
              <p className="text-base leading-[1.85] text-[var(--cabin-ink-soft)] sm:text-[1.05rem]">
                {cabin.description}
              </p>
            </section>
          )}

          <div className="border-t border-[var(--cabin-border-soft)]" />

          {/* Tarifas por noche — only for tiered cabins */}
          {cabin.lowOccupancyPrice != null && cabin.lowOccupancyThreshold != null && (
            <>
              <section>
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--cabin-ink-faint)]">
                  Tarifas por noche
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-[var(--cabin-bg)] px-4 py-3">
                    <p className="text-sm text-[var(--cabin-ink-soft)]">
                      1–{cabin.lowOccupancyThreshold} personas
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-[var(--cabin-ink)]">
                      {formatCurrency(cabin.lowOccupancyPrice)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[var(--cabin-bg)] px-4 py-3">
                    <p className="text-sm text-[var(--cabin-ink-soft)]">
                      {cabin.lowOccupancyThreshold + 1}–{cabin.capacityAdults} personas
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-[var(--cabin-ink)]">
                      {formatCurrency(cabin.basePrice)}
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-[var(--cabin-ink-faint)]">
                  El precio se ajusta automáticamente al indicar el número de personas.
                </p>
              </section>
              <div className="border-t border-[var(--cabin-border-soft)]" />
            </>
          )}

          {/* Tu espacio */}
          <section>
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--cabin-ink-faint)]">
              {bookingCopy.detail.specsTitle}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <span className="rounded-full bg-[var(--cabin-olive-soft)] px-4 py-2 text-xs font-medium text-[var(--cabin-ink)]">
                {bookingCopy.catalog.capacityLabel(cabin.capacityAdults)}
              </span>
              {cabin.bedType && (
                <span className="rounded-full bg-[var(--cabin-olive-soft)] px-4 py-2 text-xs font-medium text-[var(--cabin-ink)]">
                  {cabin.bedType}
                </span>
              )}
              {cabin.sizeM2 && (
                <span className="rounded-full bg-[var(--cabin-olive-soft)] px-4 py-2 text-xs font-medium text-[var(--cabin-ink)]">
                  {cabin.sizeM2} m²
                </span>
              )}
            </div>
          </section>

          {/* Incluido en tu estancia */}
          {cabin.amenities.length > 0 && (
            <>
              <div className="border-t border-[var(--cabin-border-soft)]" />
              <section>
                <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--cabin-ink-faint)]">
                  {bookingCopy.detail.amenitiesTitle}
                </p>
                <ul className="grid gap-y-3.5 sm:grid-cols-2 sm:gap-x-8">
                  {cabin.amenities.map((a) => (
                    <li
                      key={a.name}
                      className="flex items-center gap-3 text-sm text-[var(--cabin-ink-soft)]"
                    >
                      <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--cabin-terra)]" />
                      {a.name}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
