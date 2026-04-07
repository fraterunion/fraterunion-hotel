'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../components/admin/AdminShell';
import SectionCard from '../../components/admin/SectionCard';
import StatusBadge from '../../components/admin/StatusBadge';
import StatCard from '../../components/admin/StatCard';

type Room = {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  status: string;
};

type Reservation = {
  id: string;
  reservationCode: string;
  status: string;
  paymentStatus: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: string;
  amountPaid: string;
  adults: number;
  children: number;
  createdAt: string;
  guest: {
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
  };
  assignedRoom?: {
    id: string;
    roomNumber: string;
  } | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  function clearAuthAndRedirect() {
    localStorage.removeItem('fu_admin_token');
    localStorage.removeItem('fu_admin_user');
    router.push('/login');
  }

  async function loadReservations(status?: string) {
    const token = localStorage.getItem('fu_admin_token');

    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';

      const [reservationsRes, roomsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/reservations${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE_URL}/admin/rooms`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (reservationsRes.status === 401 || roomsRes.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      const reservationsData = await reservationsRes.json();
      const roomsData = await roomsRes.json();

      if (!reservationsRes.ok) {
        throw new Error(
          reservationsData?.message || 'Failed to load reservations',
        );
      }

      if (!roomsRes.ok) {
        throw new Error(roomsData?.message || 'Failed to load rooms');
      }

      setReservations(reservationsData);
      setRooms(roomsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReservations(statusFilter);
  }, [statusFilter]);

  async function handleAssignRoom(reservationId: string, roomId: string) {
    const token = localStorage.getItem('fu_admin_token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setAssigningId(reservationId);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/admin/reservations/${reservationId}/assign-room`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roomId: roomId || null,
          }),
        },
      );

      if (response.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to assign room');
      }

      await loadReservations(statusFilter);
    } catch (err: any) {
      setError(err.message || 'Failed to assign room');
    } finally {
      setAssigningId(null);
    }
  }

  async function handleReservationAction(
    reservationId: string,
    action: 'check-in' | 'check-out',
  ) {
    const token = localStorage.getItem('fu_admin_token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setActioningId(reservationId);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/admin/reservations/${reservationId}/${action}`,
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

      await loadReservations(statusFilter);
    } catch (err: any) {
      setError(err.message || `Failed to ${action}`);
    } finally {
      setActioningId(null);
    }
  }

  const stats = useMemo(() => {
    const pending = reservations.filter((r) => r.status === 'PENDING').length;
    const confirmed = reservations.filter((r) => r.status === 'CONFIRMED').length;
    const checkedIn = reservations.filter((r) => r.status === 'CHECKED_IN').length;
    const checkedOut = reservations.filter((r) => r.status === 'CHECKED_OUT').length;
    const paidRevenue = reservations.reduce(
      (sum, r) => sum + Number(r.amountPaid || 0),
      0,
    );

    return {
      total: reservations.length,
      pending,
      confirmed,
      checkedIn,
      checkedOut,
      paidRevenue,
    };
  }, [reservations]);

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

  return (
    <AdminShell
      title="Reservations"
      subtitle="Review bookings, payment status, room assignment, and day-to-day operational actions."
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Confirmed" value={stats.confirmed} />
        <StatCard label="Checked in" value={stats.checkedIn} />
        <StatCard label="Checked out" value={stats.checkedOut} />
        <StatCard label="Paid revenue" value={stats.paidRevenue} />
      </div>

      <SectionCard
        title="Reservation queue"
        subtitle="Filter reservations by operational state and manage room assignment from one place."
        rightSlot={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
          >
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="CHECKED_OUT">CHECKED_OUT</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
        }
      >
        {loading ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-sm text-neutral-500">
            Loading reservations...
          </div>
        ) : reservations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-sm text-neutral-500">
            No reservations found for the selected filter.
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation) => {
              const compatibleRooms = rooms.filter(
                (room) => room.roomTypeId === reservation.roomType.id,
              );

              return (
                <article
                  key={reservation.id}
                  className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-5 transition hover:bg-neutral-50"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/reservations/${reservation.id}`)}
                        className="text-left text-xl font-semibold tracking-tight text-neutral-900 underline-offset-4 hover:underline"
                      >
                        {reservation.reservationCode}
                      </button>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge
                          value={reservation.status}
                          tone={getStatusTone(reservation.status)}
                        />
                        <StatusBadge
                          value={reservation.paymentStatus}
                          tone={getPaymentTone(reservation.paymentStatus)}
                        />
                        <StatusBadge value={reservation.roomType.name} tone="info" />
                      </div>
                    </div>

                    <div className="text-sm text-neutral-500">
                      Created {reservation.createdAt.replace('T', ' ').slice(0, 19)}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Guest
                      </p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">
                        {reservation.guest.firstName} {reservation.guest.lastName}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {reservation.guest.email}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Stay
                      </p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">
                        {reservation.checkInDate.slice(0, 10)} →{' '}
                        {reservation.checkOutDate.slice(0, 10)}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {reservation.nights} nights
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Revenue
                      </p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">
                        Total {reservation.totalAmount}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Paid {reservation.amountPaid}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Occupancy
                      </p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">
                        {reservation.adults} adults / {reservation.children} children
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Room {reservation.assignedRoom?.roomNumber || 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Assign physical room
                      </label>
                      <select
                        value={reservation.assignedRoom?.id || ''}
                        onChange={(e) =>
                          handleAssignRoom(reservation.id, e.target.value)
                        }
                        disabled={assigningId === reservation.id}
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                      >
                        <option value="">Unassigned</option>
                        {compatibleRooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            Room {room.roomNumber} ({room.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      {reservation.status === 'CONFIRMED' ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleReservationAction(reservation.id, 'check-in')
                          }
                          disabled={actioningId === reservation.id}
                          className="rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                        >
                          {actioningId === reservation.id
                            ? 'Processing...'
                            : 'Check-in'}
                        </button>
                      ) : null}

                      {reservation.status === 'CHECKED_IN' ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleReservationAction(reservation.id, 'check-out')
                          }
                          disabled={actioningId === reservation.id}
                          className="rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                        >
                          {actioningId === reservation.id
                            ? 'Processing...'
                            : 'Check-out'}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => router.push(`/reservations/${reservation.id}`)}
                        className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                      >
                        Open detail
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </AdminShell>
  );
}