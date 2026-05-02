'use client';

import {
  hotelConfig,
  hotelLocationFull,
  hotelLocationLine,
} from '@fraterunion/config';
import { FormEvent, useMemo, useState } from 'react';
import {
  bookingCopy,
  formatGuestsLine,
  paymentStatusEs,
  reservationStatusEs,
  roomOptionsLabel,
} from '../../content/booking-es';

type AvailabilityResult = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number | string;
  capacityAdults: number;
  capacityChildren: number;
  bedType?: string | null;
  sizeM2?: number | null;
  inventory: {
    totalRooms: number;
    overlappingReservations: number;
    availableCount: number;
    isAvailable: boolean;
  };
};

type AvailabilityResponse = {
  hotel: {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    currency: string;
  };
  search: {
    checkInDate: string;
    checkOutDate: string;
  };
  results: AvailabilityResult[];
};

type ReservationResponse = {
  message: string;
  reservation: {
    id: string;
    reservationCode: string;
    status: string;
    totalAmount: string;
    paymentStatus: string;
    hotel: {
      name: string;
      slug: string;
      currency: string;
    };
    roomType: {
      name: string;
    };
    guest: {
      firstName: string;
      lastName: string;
      email: string;
    };
    checkInDate: string;
    checkOutDate: string;
    nights: number;
  };
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const HERO_BG_IMAGE = '/images/los-vagones-hero.jpg';

const ROOM_CARD_IMAGES = [
  'https://images.unsplash.com/photo-1449158743715-0a90ebb615d2?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=1400&q=80',
] as const;

function formatCurrency(value: string | number, currency = 'MXN') {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function BookingPage() {
  const [hotelSlug, setHotelSlug] = useState<string>(hotelConfig.defaultHotelSlug);
  const [checkInDate, setCheckInDate] = useState('2026-04-20');
  const [checkOutDate, setCheckOutDate] = useState('2026-04-22');

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [step, setStep] = useState<'search' | 'reserve' | 'success'>('search');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingReservation, setLoadingReservation] = useState(false);
  const [error, setError] = useState('');
  const [reservationResult, setReservationResult] =
    useState<ReservationResponse | null>(null);

  const selectedRoomType = useMemo(() => {
    return (
      availability?.results.find((item) => item.id === selectedRoomTypeId) || null
    );
  }, [availability, selectedRoomTypeId]);

  const stayNights = useMemo(() => {
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return 0;
    }
    return Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
  }, [checkInDate, checkOutDate]);

  const estimatedStayTotal =
    selectedRoomType && stayNights > 0
      ? Number(selectedRoomType.basePrice) * stayNights
      : null;

  const fieldClass =
    'w-full rounded-xl border-0 bg-[var(--cabin-elevated)] px-4 py-3.5 text-sm text-[var(--cabin-ink)] outline-none ring-1 ring-[var(--cabin-border)] transition placeholder:text-[var(--cabin-ink-faint)] focus:bg-white focus:ring-2 focus:ring-[var(--cabin-forest)]/25';

  const btnPrimaryBase =
    'inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--cabin-terra)] px-8 text-sm font-semibold tracking-wide text-[var(--lv-cream)] shadow-[0_10px_32px_rgba(176,68,48,0.40)] transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-[var(--cabin-terra-hover)] hover:shadow-[0_18px_52px_rgba(176,68,48,0.52)] active:scale-100 disabled:pointer-events-none disabled:opacity-45 disabled:hover:scale-100 disabled:hover:shadow-[0_10px_32px_rgba(176,68,48,0.40)]';

  const btnPrimary = `w-full ${btnPrimaryBase}`;

  const btnSecondary =
    'inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--cabin-forest-deep)]/25 bg-transparent px-6 text-sm font-medium tracking-wide text-[var(--cabin-forest-deep)] transition-all duration-200 hover:border-[var(--cabin-forest-deep)]/45 hover:bg-[var(--cabin-forest-deep)]/6';

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoadingSearch(true);
    setError('');
    setReservationResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/public/availability/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelSlug,
          checkInDate: `${checkInDate}T15:00:00.000Z`,
          checkOutDate: `${checkOutDate}T12:00:00.000Z`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message || bookingCopy.errors.searchFallback,
        );
      }

      setAvailability(data);
      setSelectedRoomTypeId('');
      setStep('search');
    } catch (err: any) {
      setAvailability(null);
      setError(err.message || bookingCopy.errors.searchFallback);
    } finally {
      setLoadingSearch(false);
    }
  }

  function handleSelectRoomType(roomTypeId: string) {
    setSelectedRoomTypeId(roomTypeId);
    setStep('reserve');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleReservationSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedRoomTypeId) {
      setError(bookingCopy.errors.selectRoomType);
      return;
    }

    setLoadingReservation(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/public/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelSlug,
          roomTypeId: selectedRoomTypeId,
          checkInDate: `${checkInDate}T15:00:00.000Z`,
          checkOutDate: `${checkOutDate}T12:00:00.000Z`,
          adults: Number(adults),
          children: Number(children),
          firstName,
          lastName,
          email,
          phone,
          country,
          specialRequests,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message || bookingCopy.errors.reserveFallback,
        );
      }

      setReservationResult(data);
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || bookingCopy.errors.reserveFallback);
    } finally {
      setLoadingReservation(false);
    }
  }

  const labelClass =
    'mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--cabin-olive)]';

  return (
    <main className="min-h-screen bg-[var(--cabin-bg)] text-[var(--cabin-ink)] antialiased">
      {/* Hero — dark cinematic */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG_IMAGE})` }}
          aria-hidden
        />
        {/* Dark cinematic overlays */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--lv-dark)]/95 via-[var(--lv-dark)]/50 to-[var(--lv-dark)]/22"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[var(--lv-dark)]/35 via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--cabin-terra)]">
            {hotelConfig.hotelName} · {hotelLocationLine()}
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-light leading-[1.08] tracking-tight text-[var(--lv-cream)] sm:text-5xl lg:text-[3.2rem]">
            {hotelConfig.heroTitle}
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-[var(--lv-cream)]/65 sm:text-lg">
            {hotelConfig.heroSubtitle}
          </p>
          <p className="mt-5 text-sm text-[var(--lv-cream)]/45">{hotelLocationFull()}</p>
          <div className="mt-12 flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-full border border-white/14 bg-white/7 px-4 py-2.5 text-xs font-medium text-[var(--lv-cream)]/80 backdrop-blur-sm">
              {bookingCopy.hero.checkIn} {hotelConfig.checkInTime}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/14 bg-white/7 px-4 py-2.5 text-xs font-medium text-[var(--lv-cream)]/80 backdrop-blur-sm">
              {bookingCopy.hero.checkOut} {hotelConfig.checkOutTime}
            </span>
            <span className="inline-flex max-w-full items-center rounded-full border border-white/14 bg-white/7 px-4 py-2.5 text-xs font-medium text-[var(--lv-cream)]/55 backdrop-blur-sm">
              {hotelConfig.address}
            </span>
            <span className="inline-flex max-w-full items-center rounded-full border border-[var(--cabin-terra)]/35 bg-[var(--cabin-terra)]/14 px-4 py-2.5 text-xs font-medium text-[var(--cabin-terra)] backdrop-blur-sm">
              {hotelConfig.locationReference}
            </span>
          </div>
        </div>
      </header>

      <section className="bg-[var(--cabin-bg)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
        {error ? (
          <div
            className="mb-10 rounded-2xl border border-red-200/60 bg-red-50/80 px-6 py-4 text-sm font-medium text-red-900/90 shadow-md shadow-red-900/[0.04]"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {step !== 'success' ? (
          <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,1fr)_min(100%,400px)] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 space-y-16 lg:space-y-20">
              {/* Fechas: tarjeta única; hotelSlug solo en estado para la API */}
              <section className="rounded-2xl bg-[var(--cabin-cream)] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-[var(--cabin-border-soft)] sm:p-10">
                <div className="flex flex-col gap-2 border-b border-[var(--cabin-border)] pb-8 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[var(--cabin-forest-deep)] sm:text-3xl">
                      {hotelConfig.bookingHeadline}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--cabin-ink-soft)] sm:text-base">
                      {hotelConfig.bookingSubheadline}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSearch} className="mt-8 space-y-10">
                  <div className="grid gap-8 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--cabin-parchment)]/90 p-5 ring-1 ring-[var(--cabin-border-soft)] sm:p-6">
                      <label className={labelClass}>{bookingCopy.search.arrival}</label>
                      <input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className={fieldClass}
                        required
                      />
                    </div>
                    <div className="rounded-2xl bg-[var(--cabin-parchment)]/90 p-5 ring-1 ring-[var(--cabin-border-soft)] sm:p-6">
                      <label className={labelClass}>{bookingCopy.search.departure}</label>
                      <input
                        type="date"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        className={fieldClass}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingSearch}
                    className={`w-full ${btnPrimary}`}
                  >
                    {loadingSearch
                      ? bookingCopy.search.searching
                      : bookingCopy.search.searchCta}
                  </button>
                </form>
              </section>

              {/* Tipos de habitación */}
              <section className="rounded-2xl bg-[var(--cabin-cream)] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-[var(--cabin-border-soft)] sm:p-10">
                <div className="flex flex-col gap-5 border-b border-[var(--cabin-border)] pb-8 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[var(--cabin-forest-deep)] sm:text-3xl">
                      {bookingCopy.rooms.sectionTitle}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--cabin-ink-soft)] sm:text-base">
                      {bookingCopy.rooms.sectionSubtitle}
                    </p>
                  </div>
                  {availability ? (
                    <div className="shrink-0 rounded-full bg-[var(--cabin-forest)] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--cabin-elevated)] shadow-sm">
                      {roomOptionsLabel(availability.results.length)}
                    </div>
                  ) : null}
                </div>

                {!availability ? (
                  <div className="mt-12 rounded-2xl border border-dashed border-[var(--cabin-border)] bg-gradient-to-b from-[var(--cabin-parchment)] to-[var(--cabin-cream)] px-8 py-20 text-center">
                    <p className="text-base font-semibold text-[var(--cabin-ink)]">
                      {bookingCopy.rooms.emptyTitle}
                    </p>
                    <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--cabin-ink-soft)]">
                      {bookingCopy.rooms.emptyBody}
                    </p>
                  </div>
                ) : availability.results.length === 0 ? (
                  <div className="mt-12 rounded-2xl border border-dashed border-[var(--cabin-border)] bg-[var(--cabin-parchment)]/80 px-8 py-20 text-center text-sm font-medium text-[var(--cabin-ink-soft)]">
                    {bookingCopy.rooms.noAvailability}
                  </div>
                ) : (
                  <ul className="mt-14 space-y-10">
                    {availability.results.map((roomType, roomIndex) => (
                      <li key={roomType.id}>
                        <article className="group overflow-hidden rounded-2xl bg-[var(--cabin-elevated)] shadow-[0_8px_28px_rgba(45,38,32,0.05)] ring-1 ring-[var(--cabin-border-soft)] transition duration-300 hover:shadow-[0_16px_48px_rgba(45,38,32,0.08)]">
                          <div className="relative aspect-[2.2/1] min-h-[140px] w-full overflow-hidden bg-[var(--cabin-olive-soft)] sm:aspect-[2.6/1] sm:min-h-[168px]">
                            <div
                              className="absolute inset-0 bg-cover bg-center transition duration-700 ease-out group-hover:scale-[1.03]"
                              style={{
                                backgroundImage: `url(${ROOM_CARD_IMAGES[roomIndex % ROOM_CARD_IMAGES.length]})`,
                              }}
                              aria-hidden
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--cabin-forest-deep)]/35 via-transparent to-[var(--cabin-forest)]/10" />
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--cabin-forest)] via-[var(--cabin-terra)]/70 to-[var(--cabin-olive)]/80" />
                          </div>
                          <div className="flex flex-col gap-8 p-7 sm:flex-row sm:items-end sm:justify-between sm:gap-10 sm:p-8">
                            <div className="min-w-0 flex-1 space-y-5">
                              <div>
                                <h3 className="text-xl font-semibold tracking-tight text-[var(--cabin-forest-deep)] sm:text-2xl">
                                  {roomType.name}
                                </h3>
                                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[var(--cabin-ink)] sm:text-3xl">
                                  {formatCurrency(
                                    roomType.basePrice,
                                    availability.hotel.currency,
                                  )}
                                  <span className="ml-2 text-base font-medium text-[var(--cabin-ink-faint)] sm:text-lg">
                                    {bookingCopy.rooms.perNight}
                                  </span>
                                </p>
                              </div>
                              <p className="max-w-xl text-sm leading-relaxed text-[var(--cabin-ink-soft)]">
                                {roomType.description ||
                                  bookingCopy.rooms.descriptionFallback}
                              </p>
                              <ul className="flex flex-wrap gap-2">
                                <li className="rounded-xl bg-[var(--cabin-olive-soft)]/90 px-3 py-1.5 text-xs font-medium text-[var(--cabin-ink)] ring-1 ring-[var(--cabin-border)]">
                                  {bookingCopy.rooms.upToAdults(
                                    roomType.capacityAdults,
                                  )}
                                </li>
                                <li className="rounded-xl bg-[var(--cabin-olive-soft)]/90 px-3 py-1.5 text-xs font-medium text-[var(--cabin-ink)] ring-1 ring-[var(--cabin-border)]">
                                  {bookingCopy.rooms.maxChildren(
                                    roomType.capacityChildren,
                                  )}
                                </li>
                                {roomType.bedType ? (
                                  <li className="rounded-xl bg-[var(--cabin-olive-soft)]/90 px-3 py-1.5 text-xs font-medium text-[var(--cabin-ink)] ring-1 ring-[var(--cabin-border)]">
                                    {roomType.bedType}
                                  </li>
                                ) : null}
                                {roomType.sizeM2 ? (
                                  <li className="rounded-xl bg-[var(--cabin-olive-soft)]/90 px-3 py-1.5 text-xs font-medium text-[var(--cabin-ink)] ring-1 ring-[var(--cabin-border)]">
                                    {roomType.sizeM2} m²
                                  </li>
                                ) : null}
                                <li className="rounded-xl bg-[var(--cabin-forest)]/12 px-3 py-1.5 text-xs font-semibold text-[var(--cabin-forest-deep)] ring-1 ring-[var(--cabin-forest)]/18">
                                  {bookingCopy.rooms.roomsLeft(
                                    roomType.inventory.availableCount,
                                  )}
                                </li>
                              </ul>
                            </div>
                            <div className="flex shrink-0 flex-col justify-end sm:w-52">
                              <button
                                type="button"
                                onClick={() => handleSelectRoomType(roomType.id)}
                                className={btnPrimary}
                              >
                                {bookingCopy.rooms.selectRoom}
                              </button>
                            </div>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {step === 'reserve' && selectedRoomType ? (
                <section
                  id="guest-details"
                  className="scroll-mt-28 rounded-2xl bg-[var(--cabin-cream)] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-[var(--cabin-border-soft)] sm:p-10"
                >
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--cabin-forest-deep)] sm:text-3xl">
                    {bookingCopy.guest.title}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--cabin-ink-soft)] sm:text-base">
                    {bookingCopy.guest.subtitle}
                  </p>

                  <form
                    id="booking-guest-form"
                    onSubmit={handleReservationSubmit}
                    className="mt-10 space-y-10"
                  >
                    <div className="rounded-2xl bg-[var(--cabin-parchment)]/95 p-8 ring-1 ring-[var(--cabin-border-soft)] sm:p-10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cabin-olive)]">
                        {bookingCopy.guest.contact}
                      </p>
                      <div className="mt-8 grid gap-8 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>{bookingCopy.guest.firstName}</label>
                          <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className={fieldClass}
                            required
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{bookingCopy.guest.lastName}</label>
                          <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={fieldClass}
                            required
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{bookingCopy.guest.email}</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={fieldClass}
                            required
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{bookingCopy.guest.phone}</label>
                          <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={fieldClass}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[var(--cabin-parchment)]/95 p-8 ring-1 ring-[var(--cabin-border-soft)] sm:p-10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cabin-olive)]">
                        {bookingCopy.guest.party}
                      </p>
                      <div className="mt-8 grid gap-8 sm:grid-cols-3">
                        <div>
                          <label className={labelClass}>{bookingCopy.guest.country}</label>
                          <input
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{bookingCopy.guest.adults}</label>
                          <input
                            type="number"
                            value={adults}
                            onChange={(e) => setAdults(e.target.value)}
                            className={fieldClass}
                            required
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{bookingCopy.guest.children}</label>
                          <input
                            type="number"
                            value={children}
                            onChange={(e) => setChildren(e.target.value)}
                            className={fieldClass}
                            required
                          />
                        </div>
                      </div>
                      <div className="mt-8">
                        <label className={labelClass}>
                          {bookingCopy.guest.specialRequests}
                        </label>
                        <textarea
                          value={specialRequests}
                          onChange={(e) => setSpecialRequests(e.target.value)}
                          rows={4}
                          className={`${fieldClass} min-h-[132px] resize-y`}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loadingReservation}
                      className={`w-full lg:hidden ${btnPrimary}`}
                    >
                      {loadingReservation
                        ? bookingCopy.guest.creating
                        : bookingCopy.guest.createCta}
                    </button>
                  </form>
                </section>
              ) : null}
            </div>

            <aside className="lg:sticky lg:top-8">
              <div className="rounded-2xl bg-[var(--cabin-parchment)] p-8 text-[var(--cabin-ink)] shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-[var(--cabin-border-soft)] sm:p-9">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--cabin-olive)]">
                  {bookingCopy.summary.eyebrow}
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--cabin-forest-deep)] sm:text-2xl">
                  {bookingCopy.summary.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--cabin-ink-soft)]">
                  {bookingCopy.summary.subtitle}
                </p>

                <div className="mt-10 space-y-0 border-t border-[var(--cabin-border)] pt-8">
                  <dl className="divide-y divide-[var(--cabin-border-soft)]">
                    <div className="grid gap-1 py-5 first:pt-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cabin-olive)]">
                        {bookingCopy.summary.dates}
                      </dt>
                      <dd className="text-[15px] font-medium leading-snug text-[var(--cabin-ink)]">
                        {formatDate(checkInDate)} — {formatDate(checkOutDate)}
                      </dd>
                    </div>
                    <div className="grid gap-1 py-5">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cabin-olive)]">
                        {bookingCopy.summary.nights}
                      </dt>
                      <dd className="text-2xl font-semibold tabular-nums text-[var(--cabin-forest-deep)]">
                        {stayNights > 0 ? stayNights : '—'}
                      </dd>
                    </div>
                    <div className="grid gap-1 py-5">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cabin-olive)]">
                        {bookingCopy.summary.room}
                      </dt>
                      <dd className="text-[15px] font-medium leading-snug text-[var(--cabin-ink)]">
                        {selectedRoomType?.name ?? bookingCopy.summary.roomPlaceholder}
                      </dd>
                    </div>
                    <div className="grid gap-1 py-5">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cabin-olive)]">
                        {bookingCopy.summary.guests}
                      </dt>
                      <dd className="text-[15px] font-medium text-[var(--cabin-ink)]">
                        {formatGuestsLine(adults, children)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 rounded-xl bg-[var(--cabin-cream)]/90 p-6 ring-1 ring-[var(--cabin-border-soft)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cabin-olive)]">
                      {bookingCopy.summary.estimatedTotal}
                    </p>
                    <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-[var(--cabin-terra)] sm:text-5xl">
                      {estimatedStayTotal != null && availability?.hotel.currency
                        ? formatCurrency(
                            estimatedStayTotal,
                            availability.hotel.currency,
                          )
                        : '—'}
                    </p>
                    {estimatedStayTotal != null ? (
                      <p className="mt-4 text-xs leading-relaxed text-[var(--cabin-ink-faint)]">
                        {bookingCopy.summary.estimateNote(stayNights)}
                      </p>
                    ) : (
                      <p className="mt-4 text-xs leading-relaxed text-[var(--cabin-ink-faint)]">
                        {bookingCopy.summary.estimateHint}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-10 space-y-3">
                  {step === 'reserve' && selectedRoomType ? (
                    <>
                      <button
                        type="submit"
                        form="booking-guest-form"
                        disabled={loadingReservation}
                        className={`hidden lg:block ${btnPrimary}`}
                      >
                        {loadingReservation
                          ? bookingCopy.summary.creating
                          : bookingCopy.guest.completeCta}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep('search')}
                        className={btnSecondary}
                      >
                        {bookingCopy.summary.changeRoom}
                      </button>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-[var(--cabin-border)] bg-[var(--cabin-cream)]/70 px-5 py-5 text-center text-xs font-medium leading-relaxed text-[var(--cabin-ink-soft)] shadow-inner shadow-[var(--cabin-shadow)]">
                      {bookingCopy.summary.lockedHint}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          reservationResult && (
            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-[var(--cabin-cream)] shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-[var(--cabin-border-soft)]">
              <div className="h-1.5 w-full bg-gradient-to-r from-[var(--cabin-forest)] via-[var(--cabin-terra)]/70 to-[var(--cabin-olive)]/80" />
              <div className="p-8 sm:p-12">
              <div className="inline-flex rounded-full bg-[var(--cabin-forest)]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--cabin-forest-deep)] ring-1 ring-[var(--cabin-forest)]/20">
                {bookingCopy.success.badge}
              </div>

              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--cabin-forest-deep)] sm:text-4xl">
                {bookingCopy.success.thankYou(
                  reservationResult.reservation.guest.firstName,
                )}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--cabin-ink-soft)]">
                {bookingCopy.success.bodyBeforeStatus(hotelConfig.hotelName)}{' '}
                <strong className="font-medium text-[var(--cabin-ink)]">
                  {reservationStatusEs[
                    reservationResult.reservation.status
                  ] ?? reservationResult.reservation.status}
                </strong>
                {bookingCopy.success.bodyAfterStatus}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--cabin-ink-faint)]">
                {bookingCopy.success.supportLinePrefix}{' '}
                {hotelConfig.checkInTime} {bookingCopy.success.supportLineMiddle}{' '}
                {hotelConfig.checkOutTime}. {bookingCopy.success.supportLineSuffix}{' '}
                <a
                  href={`mailto:${hotelConfig.supportEmail}`}
                  className="font-medium text-[var(--cabin-forest-deep)] underline-offset-4 hover:underline"
                >
                  {hotelConfig.supportEmail}
                </a>{' '}
                {bookingCopy.success.orCall} {hotelConfig.supportPhone}
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--cabin-border)] bg-[var(--cabin-elevated)]/90 p-5 shadow-sm shadow-[var(--cabin-shadow)]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cabin-olive)]">
                    {bookingCopy.success.reservationCode}
                  </p>
                  <p className="mt-2 text-lg font-medium tabular-nums text-[var(--cabin-ink)]">
                    {reservationResult.reservation.reservationCode}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--cabin-border)] bg-[var(--cabin-elevated)]/90 p-5 shadow-sm shadow-[var(--cabin-shadow)]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cabin-olive)]">
                    {bookingCopy.success.paymentStatus}
                  </p>
                  <p className="mt-2 text-lg font-medium text-[var(--cabin-ink)]">
                    {paymentStatusEs[
                      reservationResult.reservation.paymentStatus
                    ] ?? reservationResult.reservation.paymentStatus}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--cabin-border)] bg-[var(--cabin-elevated)]/90 p-5 shadow-sm shadow-[var(--cabin-shadow)]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cabin-olive)]">
                    {bookingCopy.success.totalAmount}
                  </p>
                  <p className="mt-2 text-lg font-medium tabular-nums text-[var(--cabin-ink)]">
                    {formatCurrency(
                      reservationResult.reservation.totalAmount,
                      reservationResult.reservation.hotel.currency,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--cabin-border)] bg-[var(--cabin-elevated)]/90 p-5 shadow-sm shadow-[var(--cabin-shadow)]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cabin-olive)]">
                    {bookingCopy.success.hotel}
                  </p>
                  <p className="mt-2 text-lg font-medium text-[var(--cabin-ink)]">
                    {reservationResult.reservation.hotel.name}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--cabin-border)] bg-[var(--cabin-elevated)]/90 p-5 shadow-sm shadow-[var(--cabin-shadow)]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cabin-olive)]">
                    {bookingCopy.success.roomType}
                  </p>
                  <p className="mt-2 text-lg font-medium text-[var(--cabin-ink)]">
                    {reservationResult.reservation.roomType.name}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--cabin-border)] bg-[var(--cabin-elevated)]/90 p-5 shadow-sm shadow-[var(--cabin-shadow)]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cabin-olive)]">
                    {bookingCopy.success.stay}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--cabin-ink)]">
                    {formatDate(reservationResult.reservation.checkInDate)} →{' '}
                    {formatDate(reservationResult.reservation.checkOutDate)}
                  </p>
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    if (!reservationResult?.reservation?.id) return;

                    try {
                      const response = await fetch(
                        `${API_BASE_URL}/public/payments/checkout-session`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            reservationId: reservationResult.reservation.id,
                          }),
                        },
                      );

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(
                          data?.message || bookingCopy.errors.paymentFallback,
                        );
                      }

                      if (data.checkoutUrl) {
                        window.location.href = data.checkoutUrl;
                      }
                    } catch (err: any) {
                      setError(err.message || bookingCopy.errors.paymentFallback);
                    }
                  }}
                  className={`${btnPrimaryBase} w-full px-8 sm:w-auto`}
                >
                  {bookingCopy.success.proceedPay}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('search');
                    setReservationResult(null);
                    setAvailability(null);
                    setSelectedRoomTypeId('');
                  }}
                  className={`${btnSecondary} px-8 sm:w-auto`}
                >
                  {bookingCopy.success.anotherBooking}
                </button>
              </div>
              </div>
            </div>
          )
        )}
        </div>
      </section>
    </main>
  );
}