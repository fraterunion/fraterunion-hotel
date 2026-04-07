'use client';

import { FormEvent, useMemo, useState } from 'react';

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

const DEFAULT_HOTEL_SLUG = 'hotel-boutique-demo';

function formatCurrency(value: string | number, currency = 'MXN') {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function BookingPage() {
  const [hotelSlug, setHotelSlug] = useState(DEFAULT_HOTEL_SLUG);
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
            : data?.message || 'Failed to search availability',
        );
      }

      setAvailability(data);
      setSelectedRoomTypeId('');
      setStep('search');
    } catch (err: any) {
      setAvailability(null);
      setError(err.message || 'Failed to search availability');
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
      setError('Please select a room type');
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
            : data?.message || 'Failed to create reservation',
        );
      }

      setReservationResult(data);
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Failed to create reservation');
    } finally {
      setLoadingReservation(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            FraterUnion Hotel
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-neutral-950">
                Premium direct booking experience for modern hotels.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
                Search availability, choose the ideal room type, and complete your
                reservation in a polished end-to-end experience.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
              <p className="text-sm font-medium text-neutral-500">Experience highlights</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-neutral-900">
                    Real-time availability
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Inventory-aware search connected to physical room stock.
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-neutral-900">
                    Direct payments
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Reservation and payment flow connected to Stripe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {step !== 'success' ? (
          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <aside className="space-y-6">
              <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
                  Search your stay
                </h2>
                <p className="mt-2 text-sm text-neutral-500">
                  Choose your dates to see available room categories.
                </p>

                <form onSubmit={handleSearch} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Hotel slug
                    </label>
                    <input
                      value={hotelSlug}
                      onChange={(e) => setHotelSlug(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Check-in
                    </label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Check-out
                    </label>
                    <input
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingSearch}
                    className="w-full rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                  >
                    {loadingSearch ? 'Searching...' : 'Search availability'}
                  </button>
                </form>
              </section>

              {step === 'reserve' && selectedRoomType ? (
                <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                    Selected room
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">
                    {selectedRoomType.name}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-500">
                    {formatCurrency(
                      selectedRoomType.basePrice,
                      availability?.hotel.currency || 'MXN',
                    )}{' '}
                    per night
                  </p>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl bg-neutral-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Stay
                      </p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">
                        {formatDate(checkInDate)} → {formatDate(checkOutDate)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Guests
                      </p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">
                        {adults} adults / {children} children
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('search')}
                    className="mt-4 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                  >
                    Change selection
                  </button>
                </section>
              ) : null}
            </aside>

            <div className="space-y-6">
              <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                      Available room types
                    </h2>
                    <p className="mt-2 text-sm text-neutral-500">
                      Results for the selected stay dates.
                    </p>
                  </div>

                  {availability ? (
                    <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                      {availability.results.length} option
                      {availability.results.length === 1 ? '' : 's'} available
                    </div>
                  ) : null}
                </div>

                {!availability ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 p-10 text-sm text-neutral-500">
                    Search availability to see premium room options.
                  </div>
                ) : availability.results.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 p-10 text-sm text-neutral-500">
                    No room types available for those dates.
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {availability.results.map((roomType) => (
                      <article
                        key={roomType.id}
                        className="rounded-3xl border border-neutral-200 bg-neutral-50/70 p-5 transition hover:bg-neutral-50"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <h3 className="text-2xl font-semibold tracking-tight text-neutral-900">
                              {roomType.name}
                            </h3>
                            <p className="mt-2 text-sm text-neutral-500">
                              {roomType.description || 'No description provided.'}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                              Starting at
                            </p>
                            <p className="mt-2 text-xl font-semibold text-neutral-900">
                              {formatCurrency(
                                roomType.basePrice,
                                availability.hotel.currency,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-4">
                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                              Adults
                            </p>
                            <p className="mt-2 text-sm font-semibold text-neutral-900">
                              {roomType.capacityAdults}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                              Children
                            </p>
                            <p className="mt-2 text-sm font-semibold text-neutral-900">
                              {roomType.capacityChildren}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                              Bed type
                            </p>
                            <p className="mt-2 text-sm font-semibold text-neutral-900">
                              {roomType.bedType || '—'}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                              Available
                            </p>
                            <p className="mt-2 text-sm font-semibold text-neutral-900">
                              {roomType.inventory.availableCount}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSelectRoomType(roomType.id)}
                            className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
                          >
                            Reserve this room type
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {step === 'reserve' && selectedRoomType ? (
                <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                    Guest details
                  </h2>
                  <p className="mt-2 text-sm text-neutral-500">
                    Complete the reservation details for your selected room type.
                  </p>

                  <form onSubmit={handleReservationSubmit} className="mt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                          First name
                        </label>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Last name
                        </label>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Phone
                        </label>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Country
                        </label>
                        <input
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Adults
                        </label>
                        <input
                          type="number"
                          value={adults}
                          onChange={(e) => setAdults(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Children
                        </label>
                        <input
                          type="number"
                          value={children}
                          onChange={(e) => setChildren(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Special requests
                      </label>
                      <textarea
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                      />
                    </div>

                    <div className="rounded-3xl bg-neutral-50 p-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Reservation summary
                      </p>
                      <div className="mt-3 grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-sm text-neutral-500">Room type</p>
                          <p className="mt-1 text-sm font-semibold text-neutral-900">
                            {selectedRoomType.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500">Stay</p>
                          <p className="mt-1 text-sm font-semibold text-neutral-900">
                            {formatDate(checkInDate)} → {formatDate(checkOutDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500">Rate</p>
                          <p className="mt-1 text-sm font-semibold text-neutral-900">
                            {formatCurrency(
                              selectedRoomType.basePrice,
                              availability?.hotel.currency || 'MXN',
                            )}{' '}
                            / night
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loadingReservation}
                      className="w-full rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                    >
                      {loadingReservation
                        ? 'Creating reservation...'
                        : 'Create reservation'}
                    </button>
                  </form>
                </section>
              ) : null}
            </div>
          </div>
        ) : (
          reservationResult && (
            <div className="mx-auto max-w-4xl rounded-3xl border border-green-200 bg-white p-8 shadow-sm">
              <div className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-green-700">
                Reservation created
              </div>

              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900">
                Thank you, {reservationResult.reservation.guest.firstName}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-600">
                Your reservation has been created successfully and is currently in{' '}
                <strong>{reservationResult.reservation.status}</strong> status.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Reservation code
                  </p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {reservationResult.reservation.reservationCode}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Payment status
                  </p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {reservationResult.reservation.paymentStatus}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Total amount
                  </p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {formatCurrency(
                      reservationResult.reservation.totalAmount,
                      reservationResult.reservation.hotel.currency,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Hotel
                  </p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {reservationResult.reservation.hotel.name}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Room type
                  </p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {reservationResult.reservation.roomType.name}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Stay
                  </p>
                  <p className="mt-2 text-sm font-semibold text-neutral-900">
                    {formatDate(reservationResult.reservation.checkInDate)} →{' '}
                    {formatDate(reservationResult.reservation.checkOutDate)}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
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
                          data?.message || 'Failed to create checkout session',
                        );
                      }

                      if (data.checkoutUrl) {
                        window.location.href = data.checkoutUrl;
                      }
                    } catch (err: any) {
                      setError(err.message || 'Failed to start payment');
                    }
                  }}
                  className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  Proceed to payment
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('search');
                    setReservationResult(null);
                    setAvailability(null);
                    setSelectedRoomTypeId('');
                  }}
                  className="rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                >
                  Create another reservation
                </button>
              </div>
            </div>
          )
        )}
      </section>
    </main>
  );
}