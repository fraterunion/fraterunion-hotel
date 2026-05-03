'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { bookingCopy } from '../content/booking-es';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type Props = {
  hotelSlug: string;
  roomTypeSlug: string;
  checkIn: string;
  checkOut: string;
  onCheckInChange: (v: string) => void;
  onCheckOutChange: (v: string) => void;
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const RANGE_BG = 'var(--cabin-olive-soft)';
const TERRA = 'var(--cabin-terra)';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = (firstDay.getUTCDay() + 6) % 7; // Mon = 0
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function BookingCalendar({
  hotelSlug,
  roomTypeSlug,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
}: Props) {
  const today = todayStr();

  const [displayYear, setDisplayYear] = useState(() => new Date().getFullYear());
  const [displayMonth, setDisplayMonth] = useState(() => new Date().getMonth() + 1);
  const [hoverDate, setHoverDate] = useState('');

  // Map<"YYYY-MM", Set<string>> — populated asynchronously
  const blockedCache = useRef<Map<string, Set<string>>>(new Map());
  const fetchingKeys = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  const monthKey = (y: number, m: number) =>
    `${y}-${String(m).padStart(2, '0')}`;

  const fetchMonth = useCallback(
    async (y: number, m: number) => {
      const key = monthKey(y, m);
      if (blockedCache.current.has(key) || fetchingKeys.current.has(key)) return;
      fetchingKeys.current.add(key);
      setLoadingKeys((prev) => new Set(prev).add(key));
      try {
        const res = await fetch(
          `${API_BASE_URL}/public/availability/calendar?hotelSlug=${encodeURIComponent(hotelSlug)}&roomTypeSlug=${encodeURIComponent(roomTypeSlug)}&year=${y}&month=${m}`,
        );
        if (!res.ok) throw new Error();
        const data: { blockedNights: string[] } = await res.json();
        blockedCache.current.set(key, new Set(data.blockedNights));
        forceUpdate((n) => n + 1);
      } catch {
        setErrorKeys((prev) => new Set(prev).add(key));
      } finally {
        fetchingKeys.current.delete(key);
        setLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [hotelSlug, roomTypeSlug],
  );

  useEffect(() => {
    fetchMonth(displayYear, displayMonth);
    const nm = displayMonth === 12 ? 1 : displayMonth + 1;
    const ny = displayMonth === 12 ? displayYear + 1 : displayYear;
    fetchMonth(ny, nm);
  }, [displayYear, displayMonth, fetchMonth]);

  function isBlocked(ds: string): boolean {
    const set = blockedCache.current.get(ds.slice(0, 7));
    return set?.has(ds) ?? false;
  }

  // Returns the first blocked night >= checkIn, or null if none found in loaded data.
  // A checkout ON this date is valid (guest leaves that morning).
  function computeMaxCheckout(ci: string): string | null {
    const ciMs = new Date(ci + 'T00:00:00Z').getTime();
    for (let i = 1; i <= 90; i++) {
      const ds = new Date(ciMs + i * 86400000).toISOString().slice(0, 10);
      const set = blockedCache.current.get(ds.slice(0, 7));
      if (set === undefined) continue; // month not loaded — treat as open
      if (set.has(ds)) return ds;
    }
    return null;
  }

  function getDayState(ds: string): string {
    if (ds < today) return 'past';
    if (ds === checkIn) return 'checkin';
    if (ds === checkOut) return 'checkout';
    if (checkIn && checkOut && ds > checkIn && ds < checkOut) return 'inrange';
    if (checkIn && !checkOut && hoverDate > checkIn) {
      const max = computeMaxCheckout(checkIn);
      const effectiveHover =
        max === null || hoverDate <= max ? hoverDate : max;
      if (ds === effectiveHover) return 'hoverend';
      if (ds > checkIn && ds < effectiveHover) return 'hoverrange';
    }
    if (isBlocked(ds)) return 'blocked';
    return 'available';
  }

  function handleClick(ds: string) {
    if (ds < today) return;
    if (!checkIn || (checkIn && checkOut)) {
      if (isBlocked(ds)) return;
      onCheckInChange(ds);
      onCheckOutChange('');
      return;
    }
    // checkIn set, no checkOut
    if (ds <= checkIn) {
      if (isBlocked(ds)) return;
      onCheckInChange(ds);
      onCheckOutChange('');
    } else {
      const max = computeMaxCheckout(checkIn);
      if (max !== null && ds > max) return;
      onCheckOutChange(ds);
    }
  }

  function prevMonth() {
    if (displayMonth === 1) {
      setDisplayYear((y) => y - 1);
      setDisplayMonth(12);
    } else {
      setDisplayMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (displayMonth === 12) {
      setDisplayYear((y) => y + 1);
      setDisplayMonth(1);
    } else {
      setDisplayMonth((m) => m + 1);
    }
  }

  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;
  const canGoPrev =
    displayYear > nowYear ||
    (displayYear === nowYear && displayMonth > nowMonth);

  const currentKey = monthKey(displayYear, displayMonth);
  const isLoading = loadingKeys.has(currentKey);
  const hasError = errorKeys.has(currentKey);
  const cells = buildMonthGrid(displayYear, displayMonth);

  const hint = !checkIn
    ? bookingCopy.detail.selectCheckIn
    : !checkOut
      ? bookingCopy.detail.selectCheckOut
      : '';

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          aria-label="Mes anterior"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-[var(--cabin-ink-faint)] transition hover:bg-[var(--cabin-bg-deep)] hover:text-[var(--cabin-ink)] disabled:pointer-events-none disabled:opacity-20"
        >
          ←
        </button>
        <p className="text-sm font-semibold text-[var(--cabin-forest-deep)]">
          {MONTH_NAMES[displayMonth - 1]} {displayYear}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Mes siguiente"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-[var(--cabin-ink-faint)] transition hover:bg-[var(--cabin-bg-deep)] hover:text-[var(--cabin-ink)]"
        >
          →
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="text-[10px] font-semibold uppercase tracking-wider text-[var(--cabin-ink-faint)]"
          >
            {w}
          </span>
        ))}
      </div>

      {/* Day grid */}
      {isLoading ? (
        <div className="flex h-36 items-center justify-center">
          <p className="text-xs text-[var(--cabin-ink-faint)]">
            {bookingCopy.detail.calendarLoading}
          </p>
        </div>
      ) : hasError ? (
        <div className="flex h-36 items-center justify-center">
          <p className="text-xs text-red-600">
            {bookingCopy.detail.calendarError}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {cells.map((ds, idx) => {
            if (!ds) return <div key={idx} className="h-9" />;

            const state = getDayState(ds);
            const dayNum = parseInt(ds.slice(8), 10);
            const isToday = ds === today;
            const isEndpoint = state === 'checkin' || state === 'checkout';
            const isHoverEnd = state === 'hoverend';
            const isCheckin = state === 'checkin';
            const isCheckout = state === 'checkout';
            const inRange = state === 'inrange';
            const inHoverRange = state === 'hoverrange';
            const isPast = state === 'past';
            const isBlockedDay = state === 'blocked';
            const isInteractive = !isPast && !isBlockedDay;

            // Strip background on the outer cell div
            let stripBg: React.CSSProperties = {};
            const hasRange = Boolean(checkIn && checkOut);
            const hasHover = Boolean(checkIn && !checkOut && hoverDate > checkIn);

            if (isCheckin && (hasRange || hasHover)) {
              stripBg = {
                background: `linear-gradient(to right, transparent 50%, ${RANGE_BG} 50%)`,
              };
            } else if (isCheckout) {
              stripBg = {
                background: `linear-gradient(to left, transparent 50%, ${RANGE_BG} 50%)`,
              };
            } else if (isHoverEnd) {
              stripBg = {
                background: `linear-gradient(to left, transparent 50%, ${RANGE_BG} 50%)`,
                opacity: 0.7,
              };
            } else if (inRange) {
              stripBg = { background: RANGE_BG };
            } else if (inHoverRange) {
              stripBg = { background: RANGE_BG, opacity: 0.55 };
            }

            // Inner circle style
            const circleStyle: React.CSSProperties =
              isEndpoint || isHoverEnd
                ? {
                    background: TERRA,
                    borderRadius: '50%',
                    boxShadow: isEndpoint
                      ? '0 4px 14px rgba(176,68,48,0.32)'
                      : undefined,
                    opacity: isHoverEnd ? 0.8 : 1,
                  }
                : {};

            const textCls = [
              'text-sm font-medium',
              isPast ? 'opacity-30 text-[var(--cabin-ink-faint)]' : '',
              isBlockedDay
                ? 'opacity-35 text-[var(--cabin-ink-faint)] line-through'
                : '',
              isEndpoint || isHoverEnd ? 'text-white' : '',
              inRange ? 'text-[var(--cabin-forest-deep)]' : '',
              inHoverRange ? 'text-[var(--cabin-forest-deep)]' : '',
              !isPast &&
              !isBlockedDay &&
              !isEndpoint &&
              !isHoverEnd &&
              !inRange &&
              !inHoverRange
                ? 'text-[var(--cabin-ink)]'
                : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div key={ds} style={stripBg} className="relative h-9">
                <button
                  type="button"
                  disabled={!isInteractive}
                  onClick={() => handleClick(ds)}
                  onMouseEnter={() =>
                    checkIn && !checkOut && setHoverDate(ds)
                  }
                  onMouseLeave={() => setHoverDate('')}
                  className={[
                    'mx-auto flex h-9 w-9 items-center justify-center rounded-full',
                    isInteractive && !isEndpoint && !isHoverEnd && !inRange && !inHoverRange
                      ? 'cursor-pointer hover:bg-[var(--cabin-bg-deep)]'
                      : '',
                    !isInteractive ? 'cursor-default' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={circleStyle}
                >
                  <span className={textCls}>{dayNum}</span>
                </button>
                {/* Today dot */}
                {isToday && !isEndpoint && !isHoverEnd && (
                  <span className="pointer-events-none absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--cabin-forest)]" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {hint && (
        <p className="mt-4 text-center text-[11px] text-[var(--cabin-ink-faint)]">
          {hint}
        </p>
      )}
    </div>
  );
}
