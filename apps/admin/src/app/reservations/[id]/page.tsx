'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminShell from '../../../components/admin/AdminShell';
import SectionCard from '../../../components/admin/SectionCard';
import StatusBadge from '../../../components/admin/StatusBadge';

type Payment = {
  id: string;
  provider: string;
  status: string;
  amount: string;
  currency: string;
  providerSessionId?: string | null;
  providerPaymentId?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

type ReservationDetail = {
  id: string;
  reservationCode: string;
  status: string;
  paymentStatus: string;
  source: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  specialRequests?: string | null;
  internalNotes?: string | null;
  totalAmount: string;
  amountPaid: string;
  baseAmount: string;
  taxAmount: string;
  feesAmount: string;
  discountAmount: string;
  createdAt: string;
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    country?: string | null;
  };
  roomType: {
    id: string;
    name: string;
    slug: string;
    bedType?: string | null;
    sizeM2?: number | null;
    capacityAdults: number;
    capacityChildren: number;
  };
  assignedRoom?: {
    id: string;
    roomNumber: string;
  } | null;
  hotel: {
    id: string;
    name: string;
    slug: string;
    currency: string;
  };
  payments: Payment[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reservationId = params?.id as string;

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState('');

  function clearAuthAndRedirect() {
    localStorage.removeItem('fu_admin_token');
    localStorage.removeItem('fu_admin_user');
    router.push('/login');
  }

  async function loadData() {
    const token = localStorage.getItem('fu_admin_token');

    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reservationRes = await fetch(
        `${API_BASE_URL}/admin/reservations/${reservationId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (reservationRes.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      const reservationData = await reservationRes.json();

      if (!reservationRes.ok) {
        throw new Error(reservationData?.message || 'Failed to load reservation');
      }

      setReservation(reservationData);
    } catch (err: any) {
      setError(err.message || 'Failed to load reservation');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (reservationId) {
      loadData();
    }
  }, [reservationId]);

  async function handleAction(action: 'check-in' | 'check-out') {
    const token = localStorage.getItem('fu_admin_token');

    if (!token || !reservation) {
      router.push('/login');
      return;
    }

    try {
      setActioning(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/admin/reservations/${reservation.id}/${action}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || `Failed to ${action}`);
      }

      await loadData();
    } catch (err: any) {
      setError(err.message || `Failed to ${action}`);
    } finally {
      setActioning(false);
    }
  }

  function getStatusTone(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
    if (status === 'CONFIRMED' || status === 'CHECKED_IN' || status === 'CHECKED_OUT') {
      return 'success';
    }
    if (status === 'PENDING') return 'warning';
    if (status === 'CANCELLED' || status === 'NO_SHOW') return 'danger';
    return 'default';
  }

  function getPaymentTone(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
    if (status === 'PAID') return 'success';
    if (status === 'PENDING') return 'warning';
    if (status === 'FAILED' || status === 'REFUNDED') return 'danger';
    return 'default';
  }

  if (loading) {
    return <main className="min-h-screen bg-neutral-100 p-8">Loading reservation...</main>;
  }

  if (!reservation) {
    return <main className="min-h-screen bg-neutral-100 p-8">Reservation not found.</main>;
  }

  return (
    <AdminShell
      title={reservation.reservationCode}
      subtitle="Reservation detail, guest information, payment history, and operational actions."
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge value={reservation.status} tone={getStatusTone(reservation.status)} />
        <StatusBadge
          value={reservation.paymentStatus}
          tone={getPaymentTone(reservation.paymentStatus)}
        />
        <StatusBadge value={reservation.source} tone="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Guest" subtitle="Primary guest information associated with this booking.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Name
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.guest.firstName} {reservation.guest.lastName}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Email
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.guest.email}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Phone
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.guest.phone || '—'}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Country
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.guest.country || '—'}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Stay" subtitle="Reservation dates, duration, occupancy and requests.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Check-in
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.checkInDate.slice(0, 10)}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Check-out
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.checkOutDate.slice(0, 10)}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Nights
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.nights}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Occupancy
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.adults} adults / {reservation.children} children
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Special requests
              </p>
              <p className="mt-2 text-sm text-neutral-900">
                {reservation.specialRequests || 'No special requests.'}
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Cabaña" subtitle="Tipo de cabaña reservado por el huésped.">
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Cabaña
              </p>
              <p className="mt-2 text-sm font-semibold text-neutral-900">
                {reservation.roomType.name}
              </p>
              <p className="mt-1 text-sm text-neutral-500">{reservation.roomType.slug}</p>
            </div>
          </SectionCard>

          <SectionCard title="Payments" subtitle="Pricing breakdown and payment activity for this reservation.">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Base
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.baseAmount}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Tax
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.taxAmount}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Fees
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.feesAmount}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Discount
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.discountAmount}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Total amount
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.hotel.currency} {reservation.totalAmount}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Amount paid
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.hotel.currency} {reservation.amountPaid}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {reservation.payments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
                  No payments recorded.
                </div>
              ) : (
                reservation.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge value={payment.provider} tone="info" />
                          <StatusBadge
                            value={payment.status}
                            tone={payment.status === 'SUCCEEDED' ? 'success' : 'warning'}
                          />
                        </div>
                        <p className="mt-3 text-xs text-neutral-500">
                          Session: {payment.providerSessionId || '—'}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Payment Intent: {payment.providerPaymentId || '—'}
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-sm font-semibold text-neutral-900">
                          {payment.currency} {payment.amount}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {payment.paidAt
                            ? `Paid at ${payment.paidAt.replace('T', ' ').slice(0, 19)}`
                            : `Created ${payment.createdAt.replace('T', ' ').slice(0, 19)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Actions" subtitle="Execute operational actions based on the current state.">
            <div className="space-y-3">
              {reservation.status === 'CONFIRMED' ? (
                <button
                  type="button"
                  onClick={() => handleAction('check-in')}
                  disabled={actioning}
                  className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  {actioning ? 'Processing...' : 'Check-in guest'}
                </button>
              ) : null}

              {reservation.status === 'CHECKED_IN' ? (
                <button
                  type="button"
                  onClick={() => handleAction('check-out')}
                  disabled={actioning}
                  className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  {actioning ? 'Processing...' : 'Check-out guest'}
                </button>
              ) : null}

              {reservation.status !== 'CONFIRMED' && reservation.status !== 'CHECKED_IN' ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
                  No operational actions available for the current status.
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Property" subtitle="Reservation-level property and audit context.">
            <div className="space-y-4">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Hotel
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.hotel.name}
                </p>
              </div>

              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Slug
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.hotel.slug}
                </p>
              </div>

              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Created
                </p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">
                  {reservation.createdAt.replace('T', ' ').slice(0, 19)}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </AdminShell>
  );
}