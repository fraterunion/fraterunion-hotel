'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../components/admin/AdminShell';
import { apiFetch } from '../../lib/api';

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

const reservationStatusStyle: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  PENDING: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    label: 'Pendiente',
  },
  CONFIRMED: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
    label: 'Confirmada',
  },
  CHECKED_IN: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'En estancia',
  },
  CHECKED_OUT: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    dot: 'bg-neutral-400',
    label: 'Finalizada',
  },
  CANCELLED: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    dot: 'bg-red-400',
    label: 'Cancelada',
  },
  NO_SHOW: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-500',
    dot: 'bg-neutral-400',
    label: 'No presentado',
  },
};

const paymentStatusStyle: Record<string, { bg: string; text: string; label: string }> = {
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Pagado' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pago pendiente' },
  PARTIALLY_PAID: { bg: 'bg-sky-50', text: 'text-sky-700', label: 'Pago parcial' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-600', label: 'Pago fallido' },
  REFUNDED: { bg: 'bg-neutral-100', text: 'text-neutral-600', label: 'Reembolsado' },
};

function StatusPill({
  style,
}: {
  style: { bg: string; text: string; dot?: string; label: string };
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${style.bg} ${style.text}`}
    >
      {style.dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      )}
      {style.label}
    </span>
  );
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'CHECKED_IN', label: 'En estancia' },
  { value: 'CHECKED_OUT', label: 'Finalizada' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'NO_SHOW', label: 'No presentado' },
];

const PAYMENT_FILTERS = [
  { value: '', label: 'Todos los pagos' },
  { value: 'PENDING', label: 'Pago pendiente' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'PARTIALLY_PAID', label: 'Pago parcial' },
  { value: 'FAILED', label: 'Fallido' },
];

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [search, setSearch] = useState('');

  function clearAuth() {
    localStorage.removeItem('fu_admin_token');
    localStorage.removeItem('fu_admin_user');
    router.push('/login');
  }

  async function loadData(status?: string) {
    const token = localStorage.getItem('fu_admin_token');
    if (!token) { router.push('/login'); return; }

    setLoading(true);
    setError('');

    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const [resData, roomsData] = await Promise.all([
        apiFetch<Reservation[]>(`/admin/reservations${query}`),
        apiFetch<Room[]>('/admin/rooms'),
      ]);
      setReservations(resData);
      setRooms(roomsData);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Request failed') {
        clearAuth();
      } else {
        setError('No se pudieron cargar las reservas.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleAssignRoom(reservationId: string, roomId: string) {
    setAssigningId(reservationId);
    try {
      await apiFetch(`/admin/reservations/${reservationId}/assign-room`, {
        method: 'PATCH',
        body: JSON.stringify({ roomId: roomId || null }),
      });
      await loadData(statusFilter);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al asignar cabaña');
    } finally {
      setAssigningId(null);
    }
  }

  async function handleAction(
    reservationId: string,
    action: 'check-in' | 'check-out',
  ) {
    setActioningId(reservationId);
    try {
      await apiFetch(`/admin/reservations/${reservationId}/${action}`, {
        method: 'PATCH',
      });
      await loadData(statusFilter);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : `Error al ejecutar ${action}`,
      );
    } finally {
      setActioningId(null);
    }
  }

  async function handleCancel(reservationId: string, code: string) {
    const confirmed = window.confirm(
      `¿Cancelar la reserva ${code}? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setCancellingId(reservationId);
    try {
      await apiFetch(`/admin/reservations/${reservationId}/cancel`, {
        method: 'PATCH',
      });
      await loadData(statusFilter);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cancelar la reserva.',
      );
    } finally {
      setCancellingId(null);
    }
  }

  // Client-side filtering
  const filtered = useMemo(() => {
    let list = reservations;

    if (paymentFilter) {
      list = list.filter((r) => r.paymentStatus === paymentFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.reservationCode.toLowerCase().includes(q) ||
          r.guest.firstName.toLowerCase().includes(q) ||
          r.guest.lastName.toLowerCase().includes(q) ||
          r.guest.email.toLowerCase().includes(q) ||
          r.roomType.name.toLowerCase().includes(q),
      );
    }

    return list;
  }, [reservations, paymentFilter, search]);

  const stats = useMemo(() => {
    const base = reservations;
    return {
      total: base.length,
      pending: base.filter((r) => r.status === 'PENDING').length,
      confirmed: base.filter((r) => r.status === 'CONFIRMED').length,
      checkedIn: base.filter((r) => r.status === 'CHECKED_IN').length,
      checkedOut: base.filter((r) => r.status === 'CHECKED_OUT').length,
      paid: base
        .filter((r) => r.paymentStatus === 'PAID')
        .reduce((sum, r) => sum + Number(r.amountPaid || 0), 0),
    };
  }, [reservations]);

  return (
    <AdminShell
      title="Reservas"
      subtitle="Gestiona el ciclo completo de cada reserva: confirmación, check-in y cobro."
    >
      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Pendientes', value: stats.pending },
          { label: 'Confirmadas', value: stats.confirmed },
          { label: 'En estancia', value: stats.checkedIn },
          { label: 'Finalizadas', value: stats.checkedOut },
          { label: 'Monto pagado', value: formatCurrency(stats.paid), wide: true },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/[0.03]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              {kpi.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
            🔍
          </span>
          <input
            type="search"
            placeholder="Buscar por huésped, código, cabaña…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-neutral-900"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Payment filter */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-neutral-900"
        >
          {PAYMENT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Reservation list */}
      <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-4 p-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <p className="text-sm font-medium text-neutral-600">
              Sin reservas para los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((res) => {
              const resSt = reservationStatusStyle[res.status];
              const paySt = paymentStatusStyle[res.paymentStatus];
              const compatibleRooms = rooms.filter(
                (r) => r.roomTypeId === res.roomType.id,
              );
              const canCancel = !['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'].includes(
                res.status,
              );

              return (
                <article key={res.id} className="p-5 transition hover:bg-neutral-50/60">
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/reservations/${res.id}`)}
                        className="font-mono text-base font-semibold text-neutral-900 underline-offset-4 hover:underline"
                      >
                        {res.reservationCode}
                      </button>
                      {resSt && <StatusPill style={resSt} />}
                      {paySt && <StatusPill style={{ ...paySt }} />}
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-700">
                        {res.roomType.name}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {res.createdAt.slice(0, 10)}
                    </span>
                  </div>

                  {/* Data grid */}
                  <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        Huésped
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-neutral-900">
                        {res.guest.firstName} {res.guest.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {res.guest.email}
                      </p>
                    </div>

                    <div className="rounded-xl bg-neutral-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        Estancia
                      </p>
                      <p className="mt-1.5 text-sm font-semibold tabular-nums text-neutral-900">
                        {res.checkInDate.slice(0, 10)} → {res.checkOutDate.slice(0, 10)}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {res.nights} {res.nights === 1 ? 'noche' : 'noches'} · {res.adults}a{' '}
                        {res.children > 0 && `${res.children}m`}
                      </p>
                    </div>

                    <div className="rounded-xl bg-neutral-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        Importe
                      </p>
                      <p className="mt-1.5 text-sm font-semibold tabular-nums text-neutral-900">
                        {formatCurrency(res.totalAmount)}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        Pagado {formatCurrency(res.amountPaid)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-neutral-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        Cabaña asignada
                      </p>
                      <select
                        value={res.assignedRoom?.id ?? ''}
                        onChange={(e) => handleAssignRoom(res.id, e.target.value)}
                        disabled={assigningId === res.id}
                        className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs outline-none transition focus:border-neutral-900 disabled:opacity-60"
                      >
                        <option value="">Sin asignar</option>
                        {compatibleRooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.roomNumber} ({room.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {res.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() => handleAction(res.id, 'check-in')}
                        disabled={actioningId === res.id}
                        className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                      >
                        {actioningId === res.id ? 'Procesando…' : 'Check-in'}
                      </button>
                    )}

                    {res.status === 'CHECKED_IN' && (
                      <button
                        type="button"
                        onClick={() => handleAction(res.id, 'check-out')}
                        disabled={actioningId === res.id}
                        className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                      >
                        {actioningId === res.id ? 'Procesando…' : 'Check-out'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => router.push(`/reservations/${res.id}`)}
                      className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Ver detalle →
                    </button>

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => handleCancel(res.id, res.reservationCode)}
                        disabled={cancellingId === res.id}
                        className="ml-auto rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        {cancellingId === res.id ? 'Cancelando…' : 'Cancelar reserva'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
