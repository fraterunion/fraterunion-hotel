'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type RoomBlock = {
  id: string;
  roomTypeId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
};

// ─── Date helpers ────────────────────────────────────────────────────────────

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function daysInMonth(year: number, month: number): number {
  // month: 1-based
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// ─── Cell style map ───────────────────────────────────────────────────────────

const cellStyle: Record<string, { bg: string; textColor: string; leftBar: string }> = {
  CONFIRMED:   { bg: 'bg-emerald-100', textColor: 'text-emerald-800', leftBar: 'bg-emerald-500' },
  CHECKED_IN:  { bg: 'bg-emerald-200', textColor: 'text-emerald-900', leftBar: 'bg-emerald-600' },
  CHECKED_OUT: { bg: 'bg-slate-100',   textColor: 'text-slate-500',   leftBar: 'bg-slate-300'   },
};

const PAID_STATUSES = new Set(['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT']);

const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const WEEKDAYS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// ─── Year range ───────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 3 + i);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router     = useRouter();
  const scrollRef  = useRef<HTMLDivElement>(null);

  const now = useMemo(() => new Date(), []);
  const [viewYear,  setViewYear]  = useState(now.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(now.getUTCMonth() + 1); // 1-based

  const [cabins,       setCabins]       = useState<Cabin[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blocks,       setBlocks]       = useState<RoomBlock[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [blockingCell, setBlockingCell] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ res: Reservation; x: number; y: number } | null>(null);

  // ── Navigation ──────────────────────────────────────────────────────────────

  function prevMonth() {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else { setViewMonth((m) => m - 1); }
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else { setViewMonth((m) => m + 1); }
  }
  function goToday() {
    setViewYear(now.getUTCFullYear());
    setViewMonth(now.getUTCMonth() + 1);
  }

  // ── Dates for current view ──────────────────────────────────────────────────

  const numDays = daysInMonth(viewYear, viewMonth);
  const dates: Date[] = useMemo(
    () => Array.from({ length: numDays }, (_, i) => new Date(Date.UTC(viewYear, viewMonth - 1, i + 1))),
    [viewYear, viewMonth, numDays],
  );

  const todayYmd = toYMD(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(() => {
    const token = localStorage.getItem('fu_admin_token');
    if (!token) { router.push('/login'); return; }

    Promise.all([
      apiFetch<Cabin[]>('/admin/room-types'),
      apiFetch<Reservation[]>('/admin/reservations'),
      apiFetch<RoomBlock[]>('/admin/blocks'),
    ])
      .then(([cabinsData, resData, blocksData]) => {
        setCabins(cabinsData.filter((c) => c.status !== 'HIDDEN'));
        setReservations(resData.filter((r) => PAID_STATUSES.has(r.status)));
        setBlocks(blocksData);
      })
      .catch(() => setError('No se pudo cargar el calendario.'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!loading && scrollRef.current) { scrollRef.current.scrollLeft = 0; }
  }, [loading, viewMonth, viewYear]);

  // ── Cell lookup helpers ─────────────────────────────────────────────────────

  function getCellReservation(cabinId: string, date: Date): Reservation | null {
    const ymd = toYMD(date);
    for (const res of reservations) {
      if (res.roomType.id !== cabinId) continue;
      const ci = res.checkInDate.slice(0, 10);
      const co = res.checkOutDate.slice(0, 10);
      if (ci <= ymd && ymd < co) return res;
    }
    return null;
  }

  function getCellBlock(cabinId: string, date: Date): RoomBlock | null {
    const nightEnd = addDays(date, 1);
    for (const b of blocks) {
      if (b.roomTypeId !== cabinId) continue;
      if (new Date(b.startDate) < nightEnd && new Date(b.endDate) > date) return b;
    }
    return null;
  }

  // ── Interactions ────────────────────────────────────────────────────────────

  async function handleCellClick(cabinId: string, date: Date) {
    const res = getCellReservation(cabinId, date);
    if (res) { router.push(`/reservations/${res.id}`); return; }

    const block = getCellBlock(cabinId, date);
    if (block) {
      const confirmed = window.confirm(
        `¿Desbloquear esta noche?${block.reason ? `\nMotivo: ${block.reason}` : ''}`,
      );
      if (!confirmed) return;
      setBlockingCell(`${cabinId}-${toYMD(date)}`);
      try {
        await apiFetch(`/admin/blocks/${block.id}`, { method: 'DELETE' });
        setBlocks((prev) => prev.filter((b) => b.id !== block.id));
      } catch {
        alert('Error al desbloquear. Intenta de nuevo.');
      } finally {
        setBlockingCell(null);
      }
      return;
    }

    const reason = window.prompt('Motivo del bloqueo (opcional):') ?? undefined;
    const ymd     = toYMD(date);
    const nextYmd = toYMD(addDays(date, 1));
    setBlockingCell(`${cabinId}-${ymd}`);
    try {
      const created = await apiFetch<RoomBlock>('/admin/blocks', {
        method: 'POST',
        body: JSON.stringify({ roomTypeId: cabinId, startDate: ymd, endDate: nextYmd, reason: reason || undefined }),
      });
      setBlocks((prev) => [...prev, created]);
    } catch {
      alert('Error al bloquear la noche. Intenta de nuevo.');
    } finally {
      setBlockingCell(null);
    }
  }

  // ── Layout constants ────────────────────────────────────────────────────────

  const CELL_W      = 38;
  const CABIN_COL_W = 156;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AdminShell
      title="Calendario"
      subtitle="Vista mensual de ocupación por cabaña. Clic en celda libre para bloquear, clic en reserva para abrir detalle."
    >
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
          aria-label="Mes anterior"
        >
          ‹
        </button>

        <span className="min-w-[140px] text-center text-sm font-semibold text-neutral-900">
          {MONTHS_ES[viewMonth - 1]} {viewYear}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
          aria-label="Mes siguiente"
        >
          ›
        </button>

        <select
          value={viewYear}
          onChange={(e) => setViewYear(Number(e.target.value))}
          className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-700 outline-none focus:border-neutral-400"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={goToday}
          className="h-8 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          Hoy
        </button>

        {/* Legend */}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {[
            { label: 'Confirmada',   cls: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
            { label: 'En estancia',  cls: 'bg-emerald-200 border-emerald-400 text-emerald-900' },
            { label: 'Finalizada',   cls: 'bg-slate-100 border-slate-300 text-slate-500' },
            { label: 'Bloqueado',    cls: 'bg-neutral-700 border-neutral-600 text-neutral-100' },
          ].map((item) => (
            <span
              key={item.label}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${item.cls}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-neutral-200" />
      ) : (
        <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div ref={scrollRef} className="overflow-x-auto">
            <div style={{ minWidth: CABIN_COL_W + CELL_W * numDays }}>

              {/* Day header */}
              <div className="flex border-b border-neutral-200 bg-neutral-50">
                <div
                  style={{ width: CABIN_COL_W, minWidth: CABIN_COL_W }}
                  className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400"
                >
                  Cabaña
                </div>
                {dates.map((date) => {
                  const ymd       = toYMD(date);
                  const isToday   = ymd === todayYmd;
                  const dayNum    = date.getUTCDate();
                  const weekday   = WEEKDAYS_ES[date.getUTCDay()];
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
                      <span className={`text-[8px] font-semibold uppercase ${isToday ? 'text-neutral-400' : 'text-neutral-400'}`}>
                        {weekday}
                      </span>
                      <span className={`text-xs font-semibold leading-tight ${isToday ? 'text-white' : isWeekend ? 'text-neutral-600' : 'text-neutral-700'}`}>
                        {dayNum}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Cabin rows */}
              {cabins.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-neutral-400">Sin cabañas configuradas.</div>
              ) : (
                cabins.map((cabin, rowIdx) => (
                  <div
                    key={cabin.id}
                    className={['flex', rowIdx % 2 === 1 ? 'bg-neutral-50/40' : 'bg-white'].join(' ')}
                  >
                    {/* Cabin label */}
                    <div
                      style={{ width: CABIN_COL_W, minWidth: CABIN_COL_W }}
                      className="flex items-center border-b border-neutral-100 px-4"
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

                    {/* Day cells */}
                    {dates.map((date) => {
                      const ymd     = toYMD(date);
                      const isToday = ymd === todayYmd;
                      const isWeekend = [0, 6].includes(date.getUTCDay());
                      const cellKey   = `${cabin.id}-${ymd}`;
                      const isBusy    = blockingCell === cellKey;

                      const res   = getCellReservation(cabin.id, date);
                      const block = !res ? getCellBlock(cabin.id, date) : null;
                      const style = res && cellStyle[res.status];

                      const isResStart = res && res.checkInDate.slice(0, 10) === ymd;

                      return (
                        <div
                          key={ymd}
                          style={{ width: CELL_W, minWidth: CELL_W, height: 42 }}
                          className={[
                            'relative border-b border-l border-neutral-100 cursor-pointer transition-opacity',
                            isToday && !res && !block ? 'bg-neutral-50' : '',
                            isWeekend && !isToday && !res && !block ? 'bg-neutral-50/50' : '',
                            style ? style.bg : '',
                            block ? 'bg-neutral-700' : '',
                            isBusy ? 'opacity-40' : '',
                          ].join(' ')}
                          onMouseEnter={(e) => {
                            if (res) {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setTooltip({ res, x: rect.left + rect.width / 2, y: rect.top });
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => !isBusy && handleCellClick(cabin.id, date)}
                        >
                          {/* Left border indicator on reservation start */}
                          {style && isResStart && (
                            <div className={`absolute bottom-0 left-0 top-0 w-[3px] ${style.leftBar}`} />
                          )}
                          {/* Guest first name on start cell */}
                          {style && isResStart && (
                            <div className="absolute inset-0 flex items-center overflow-hidden pl-1.5 pr-0.5">
                              <span className={`truncate text-[9px] font-semibold ${style.textColor}`}>
                                {res!.guest.firstName}
                              </span>
                            </div>
                          )}
                          {/* Block indicator */}
                          {block && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[9px] font-semibold text-neutral-400">✕</span>
                            </div>
                          )}
                          {/* Today indicator */}
                          {isToday && !res && !block && (
                            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-neutral-900" />
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

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              {tooltip.res.reservationCode}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900">
              {tooltip.res.guest.firstName} {tooltip.res.guest.lastName}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {tooltip.res.checkInDate.slice(0, 10)} → {tooltip.res.checkOutDate.slice(0, 10)}
            </p>
            <p className="mt-1">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cellStyle[tooltip.res.status]?.bg ?? 'bg-neutral-100'} ${cellStyle[tooltip.res.status]?.textColor ?? 'text-neutral-700'}`}>
                {{ CONFIRMED: 'Confirmada', CHECKED_IN: 'En estancia', CHECKED_OUT: 'Finalizada' }[tooltip.res.status] ?? tooltip.res.status}
              </span>
            </p>
          </div>
          <div className="mx-auto h-2 w-2 -translate-y-px rotate-45 border-b border-r border-neutral-200 bg-white" />
        </div>
      )}
    </AdminShell>
  );
}
