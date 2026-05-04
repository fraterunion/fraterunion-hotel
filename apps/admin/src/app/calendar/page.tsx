'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../components/admin/AdminShell';
import { apiFetch } from '../../lib/api';

type Cabin = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

type Reservation = {
  id: string;
  reservationCode: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  roomType: { id: string; name: string };
  guest: { firstName: string; lastName: string };
};

const DAYS_TO_SHOW = 21;

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseYMD(ymd: string): Date {
  return new Date(ymd + 'T00:00:00Z');
}

function shortDate(date: Date): { weekday: string; day: string } {
  return {
    weekday: date.toLocaleDateString('es-MX', { weekday: 'short', timeZone: 'UTC' }),
    day: date.toLocaleDateString('es-MX', { day: 'numeric', timeZone: 'UTC' }),
  };
}

function shortMonth(date: Date): string {
  return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const reservationStatusCell: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  PENDING: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  CONFIRMED: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-300',
  },
  CHECKED_IN: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  CHECKED_OUT: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-500',
    border: 'border-neutral-200',
  },
};

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'En estancia',
  CHECKED_OUT: 'Finalizada',
  CANCELLED: 'Cancelada',
};

type CellInfo = {
  reservation: Reservation;
  isStart: boolean;
  isEnd: boolean;
};

export default function CalendarPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tooltip, setTooltip] = useState<{ res: Reservation; x: number; y: number } | null>(null);

  // Start from today (UTC)
  const [startDate] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  });

  const dates: Date[] = useMemo(() => {
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  useEffect(() => {
    const token = localStorage.getItem('fu_admin_token');
    if (!token) { router.push('/login'); return; }

    Promise.all([
      apiFetch<Cabin[]>('/admin/room-types'),
      apiFetch<Reservation[]>('/admin/reservations'),
    ])
      .then(([cabinsData, resData]) => {
        setCabins(cabinsData.filter((c) => c.status !== 'HIDDEN'));
        setReservations(resData.filter((r) => r.status !== 'CANCELLED'));
      })
      .catch(() => setError('No se pudo cargar el calendario.'))
      .finally(() => setLoading(false));
  }, [router]);

  // Scroll to today column on load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [loading]);

  // For each cabin+date, find the active reservation (if any)
  function getCellInfo(cabinId: string, date: Date): CellInfo | null {
    const ymd = toYMD(date);
    const nextYmd = toYMD(addDays(date, 1));

    for (const res of reservations) {
      if (res.roomType.id !== cabinId) continue;
      const checkIn = res.checkInDate.slice(0, 10);
      const checkOut = res.checkOutDate.slice(0, 10);
      // Night D is occupied if checkIn <= D < checkOut
      if (checkIn <= ymd && ymd < checkOut) {
        return {
          reservation: res,
          isStart: checkIn === ymd,
          isEnd: checkOut === nextYmd,
        };
      }
    }
    return null;
  }

  // Group consecutive dates by month for the header
  const monthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    for (const date of dates) {
      const label = shortMonth(date);
      if (groups.length > 0 && groups[groups.length - 1].label === label) {
        groups[groups.length - 1].count++;
      } else {
        groups.push({ label, count: 1 });
      }
    }
    return groups;
  }, [dates]);

  const todayYmd = toYMD(startDate);

  const CELL_W = 48; // px, matches w-12
  const CABIN_COL_W = 160; // px

  return (
    <AdminShell
      title="Calendario"
      subtitle="Vista de ocupación por cabaña · 21 días desde hoy."
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-neutral-200" />
      ) : (
        <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 border-b border-neutral-100 px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Estado
            </p>
            {[
              { label: 'Pendiente', cls: 'bg-amber-50 border-amber-300 text-amber-800' },
              { label: 'Confirmada', cls: 'bg-sky-50 border-sky-300 text-sky-800' },
              { label: 'En estancia', cls: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
              { label: 'Finalizada', cls: 'bg-neutral-100 border-neutral-200 text-neutral-500' },
            ].map((item) => (
              <span
                key={item.label}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${item.cls}`}
              >
                {item.label}
              </span>
            ))}
          </div>

          {/* Scrollable grid */}
          <div ref={scrollRef} className="overflow-x-auto">
            <div style={{ minWidth: CABIN_COL_W + CELL_W * DAYS_TO_SHOW }}>
              {/* Month header */}
              <div className="flex border-b border-neutral-100 bg-neutral-50">
                <div style={{ width: CABIN_COL_W, minWidth: CABIN_COL_W }} />
                {monthGroups.map((g, i) => (
                  <div
                    key={i}
                    style={{ width: CELL_W * g.count }}
                    className="border-l border-neutral-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500"
                  >
                    {g.label}
                  </div>
                ))}
              </div>

              {/* Day header */}
              <div className="flex border-b border-neutral-200 bg-neutral-50">
                <div
                  style={{ width: CABIN_COL_W, minWidth: CABIN_COL_W }}
                  className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400"
                >
                  Cabaña
                </div>
                {dates.map((date) => {
                  const { weekday, day } = shortDate(date);
                  const ymd = toYMD(date);
                  const isToday = ymd === todayYmd;
                  const isWeekend = [0, 6].includes(date.getUTCDay());
                  return (
                    <div
                      key={ymd}
                      style={{ width: CELL_W, minWidth: CELL_W }}
                      className={[
                        'flex flex-col items-center justify-center border-l border-neutral-100 py-1.5 text-center',
                        isToday ? 'bg-neutral-900' : isWeekend ? 'bg-neutral-50' : '',
                      ].join(' ')}
                    >
                      <span
                        className={`text-[9px] font-semibold uppercase ${isToday ? 'text-neutral-400' : 'text-neutral-400'}`}
                      >
                        {weekday.slice(0, 2)}
                      </span>
                      <span
                        className={`text-xs font-semibold leading-tight ${isToday ? 'text-white' : isWeekend ? 'text-neutral-600' : 'text-neutral-700'}`}
                      >
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Cabin rows */}
              {cabins.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-neutral-400">
                  Sin cabañas configuradas.
                </div>
              ) : (
                cabins.map((cabin, rowIdx) => (
                  <div
                    key={cabin.id}
                    className={[
                      'flex',
                      rowIdx % 2 === 1 ? 'bg-neutral-50/50' : 'bg-white',
                    ].join(' ')}
                  >
                    {/* Cabin name */}
                    <div
                      style={{ width: CABIN_COL_W, minWidth: CABIN_COL_W }}
                      className="flex items-center border-b border-neutral-100 px-4 py-0"
                    >
                      <button
                        type="button"
                        onClick={() => router.push(`/cabins/${cabin.id}`)}
                        className="truncate text-left text-xs font-semibold text-neutral-800 underline-offset-2 hover:underline"
                        title={cabin.name}
                      >
                        {cabin.name}
                      </button>
                    </div>

                    {/* Date cells */}
                    {dates.map((date) => {
                      const ymd = toYMD(date);
                      const isToday = ymd === todayYmd;
                      const isWeekend = [0, 6].includes(date.getUTCDay());
                      const cell = getCellInfo(cabin.id, date);
                      const style =
                        cell && reservationStatusCell[cell.reservation.status];

                      return (
                        <div
                          key={ymd}
                          style={{ width: CELL_W, minWidth: CELL_W, height: 44 }}
                          className={[
                            'relative border-b border-l border-neutral-100',
                            isToday ? 'border-l-neutral-900 bg-neutral-50' : '',
                            isWeekend && !isToday ? 'bg-neutral-50/60' : '',
                            cell && style
                              ? `${style.bg} cursor-pointer`
                              : '',
                          ].join(' ')}
                          onMouseEnter={(e) => {
                            if (cell) {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setTooltip({
                                res: cell.reservation,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() =>
                            cell &&
                            router.push(`/reservations/${cell.reservation.id}`)
                          }
                        >
                          {cell && style && (
                            <>
                              {/* Left border accent */}
                              {cell.isStart && (
                                <div
                                  className={`absolute bottom-0 left-0 top-0 w-[3px] ${style.border.replace('border-', 'bg-')}`}
                                />
                              )}
                              {/* Reservation code — only on start */}
                              {cell.isStart && (
                                <div className="absolute inset-0 flex items-center overflow-hidden px-1.5">
                                  <span
                                    className={`truncate text-[9px] font-semibold ${style.text}`}
                                  >
                                    {cell.reservation.guest.firstName}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tooltip — rendered in portal-like fixed position */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              {tooltip.res.reservationCode}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900">
              {tooltip.res.guest.firstName} {tooltip.res.guest.lastName}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {tooltip.res.checkInDate.slice(0, 10)} →{' '}
              {tooltip.res.checkOutDate.slice(0, 10)}
            </p>
            <p className="mt-1">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  reservationStatusCell[tooltip.res.status]?.bg ?? 'bg-neutral-100'
                } ${reservationStatusCell[tooltip.res.status]?.text ?? 'text-neutral-700'}`}
              >
                {statusLabel[tooltip.res.status] ?? tooltip.res.status}
              </span>
            </p>
          </div>
          {/* Arrow */}
          <div className="mx-auto h-2 w-2 -translate-y-px rotate-45 border-b border-r border-neutral-200 bg-white" />
        </div>
      )}
    </AdminShell>
  );
}
