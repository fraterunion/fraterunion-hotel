'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../components/admin/AdminShell';
import { apiFetch } from '../../lib/api';

type RechartsModule = typeof import('recharts');

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type DashboardMetrics = {
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  revenueLifetime: number;
  occupancyThisMonth: number;
  occupancyThisYear: number;
  cabinPerformance: Array<{
    id: string;
    name: string;
    revenue: number;
    reservations: number;
    occupancyMonth: number;
  }>;
  revenueByDay: Array<{ date: string; value: number }>;
  revenueByWeek: Array<{ week: string; value: number }>;
  revenueByMonth: Array<{ month: string; value: number }>;
  revenueByYear: Array<{ year: string; value: number }>;
  currentlyCheckedIn: number;
  todayArrivals: number;
  todayDepartures: number;
};

type RecentReservation = {
  id: string;
  reservationCode: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  totalAmount: string;
  amountPaid: string;
  checkInDate: string;
  checkOutDate: string;
  guest: { firstName: string; lastName: string };
  roomType: { name: string };
};

type ChartPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fmtDay(dateStr: string): string {
  const [, mo, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTHS_ES[parseInt(mo) - 1]}`;
}

function fmtMonth(dateStr: string): string {
  const [y, mo] = dateStr.split('-');
  return `${MONTHS_ES[parseInt(mo) - 1]} '${y.slice(2)}`;
}

const chartAxisTick = { fill: '#a3a3a3', fontSize: 11 };
const chartBarFill = '#64748b';
const chartBarFillEnd = '#4a5568';

function ChartTooltipFrame({ eyebrow, children }: { eyebrow?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200/80 bg-white px-3.5 py-2.5 shadow-[0_4px_24px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.04)]">
      {eyebrow ? (
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">{eyebrow}</p>
      ) : null}
      <div className={`tabular-nums text-[13px] font-semibold leading-snug tracking-tight text-neutral-900 ${eyebrow ? 'mt-1' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function RevenueTooltip({
  active, payload, label, fmt,
}: { active?: boolean; payload?: ReadonlyArray<{ value?: number }>; label?: string; fmt: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  if (value == null) return null;
  return <ChartTooltipFrame eyebrow={label != null ? String(label) : undefined}>{fmt(value)}</ChartTooltipFrame>;
}

function RevenueChart({ recharts, data, fmt }: { recharts: RechartsModule; data: { name: string; value: number }[]; fmt: (v: number) => string }) {
  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } = recharts;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartBarFill} stopOpacity={1} />
            <stop offset="100%" stopColor={chartBarFillEnd} stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#94a3b8" strokeOpacity={0.18} strokeDasharray="4 6" vertical={false} />
        <XAxis dataKey="name" axisLine={{ stroke: '#e5e5e5' }} tickLine={false} tick={chartAxisTick} dy={4} interval="preserveStartEnd" />
        <YAxis axisLine={false} tickLine={false} tick={chartAxisTick} tickFormatter={(v: number) => fmt(v)} width={72} />
        <Tooltip content={<RevenueTooltip fmt={fmt} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} wrapperStyle={{ outline: 'none' }} />
        <Bar dataKey="value" fill="url(#revBar)" radius={[5, 5, 2, 2]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type InsightTone = 'warning' | 'positive' | 'neutral';
const insightIconWrap: Record<InsightTone, string> = {
  warning: 'bg-amber-100/90 text-amber-800 ring-1 ring-amber-200/70',
  positive: 'bg-emerald-100/90 text-emerald-800 ring-1 ring-emerald-200/70',
  neutral: 'bg-white text-neutral-600 ring-1 ring-neutral-200/80',
};

function InsightIcon({ tone }: { tone: InsightTone }) {
  const wrap = `flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${insightIconWrap[tone]}`;
  if (tone === 'warning') {
    return (
      <div className={wrap}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
        </svg>
      </div>
    );
  }
  if (tone === 'positive') {
    return (
      <div className={wrap}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
    );
  }
  return (
    <div className={wrap}>
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
      </svg>
    </div>
  );
}

const reservationStatusClasses: Record<string, string> = {
  PENDING:    'bg-amber-50 text-amber-700',
  CONFIRMED:  'bg-sky-50 text-sky-700',
  CHECKED_IN: 'bg-emerald-50 text-emerald-700',
  CHECKED_OUT:'bg-neutral-100 text-neutral-600',
  CANCELLED:  'bg-rose-50 text-rose-700',
  NO_SHOW:    'bg-neutral-100 text-neutral-500',
};
const reservationStatusLabel: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CHECKED_IN: 'En estancia',
  CHECKED_OUT: 'Finalizada', CANCELLED: 'Cancelada', NO_SHOW: 'No presentado',
};

const PERIOD_LABELS: Record<ChartPeriod, string> = {
  daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]       = useState<AdminUser | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recent, setRecent]   = useState<RecentReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechartsMod, setRechartsMod] = useState<RechartsModule | null>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('monthly');

  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem('fu_admin_token');
      if (!token) { router.push('/login'); return; }
      try {
        const [meData, dashData, resData] = await Promise.all([
          apiFetch<{ user: AdminUser }>('/auth/me'),
          apiFetch<DashboardMetrics>('/admin/metrics/dashboard'),
          apiFetch<RecentReservation[]>('/admin/reservations'),
        ]);
        setUser(meData.user);
        setMetrics(dashData);
        setRecent(
          resData
            .filter((r) => ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(r.status))
            .slice(0, 6),
        );
      } catch {
        localStorage.removeItem('fu_admin_token');
        localStorage.removeItem('fu_admin_user');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [router]);

  useEffect(() => { void import('recharts').then(setRechartsMod); }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-sm text-neutral-400">Cargando panel…</p>
      </main>
    );
  }

  if (!user || !metrics) return null;

  const fmt = (v: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;

  // Chart data per period
  const chartDataMap: Record<ChartPeriod, { name: string; value: number }[]> = {
    daily:   metrics.revenueByDay.map((d) => ({ name: fmtDay(d.date),    value: d.value })),
    weekly:  metrics.revenueByWeek.map((w) => ({ name: fmtDay(w.week),   value: w.value })),
    monthly: metrics.revenueByMonth.map((m) => ({ name: fmtMonth(m.month), value: m.value })),
    yearly:  metrics.revenueByYear.map((y) => ({ name: y.year,           value: y.value })),
  };

  const activeChartData = chartDataMap[chartPeriod];

  // Opportunities
  type Insight = { tone: InsightTone; title: string; explanation: string };
  const raw: Insight[] = [];

  for (const cabin of metrics.cabinPerformance) {
    if (cabin.occupancyMonth < 0.3) {
      raw.push({
        tone: 'warning',
        title: `${cabin.name}: baja ocupación`,
        explanation: `Solo ${fmtPct(cabin.occupancyMonth)} de ocupación este mes.`,
      });
    }
  }
  if (metrics.todayArrivals > 0) {
    raw.push({
      tone: 'positive',
      title: `${metrics.todayArrivals} llegada${metrics.todayArrivals > 1 ? 's' : ''} hoy`,
      explanation: 'Hay huéspedes que inician su estancia hoy.',
    });
  }
  if (metrics.revenueThisMonth > 0) {
    raw.push({
      tone: 'positive',
      title: 'Ingresos activos este mes',
      explanation: `${fmt(metrics.revenueThisMonth)} confirmados este mes.`,
    });
  }
  if (metrics.currentlyCheckedIn === 0 && metrics.revenueThisMonth === 0) {
    raw.push({
      tone: 'neutral',
      title: 'Sin actividad este mes',
      explanation: 'No hay estancias activas ni ingresos registrados.',
    });
  }
  if (metrics.todayDepartures > 0) {
    raw.push({
      tone: 'neutral',
      title: `${metrics.todayDepartures} salida${metrics.todayDepartures > 1 ? 's' : ''} hoy`,
      explanation: 'Hay huéspedes con checkout programado para hoy.',
    });
  }

  const insights = [
    ...raw.filter((i) => i.tone === 'warning'),
    ...raw.filter((i) => i.tone === 'positive'),
    ...raw.filter((i) => i.tone === 'neutral'),
  ].slice(0, 3);

  if (insights.length === 0) {
    insights.push({ tone: 'neutral', title: 'Todo en orden', explanation: 'Sin patrones destacables en este momento.' });
  }

  return (
    <AdminShell
      title="Panel de control"
      subtitle={`Bienvenido, ${user.firstName || 'Administrador'}. Ingresos, ocupación y rendimiento en tiempo real.`}
    >
      <div className="w-full space-y-8">

        {/* ── Revenue KPIs ── */}
        <section>
          <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">Ingresos</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Hoy',            value: fmt(metrics.revenueToday) },
              { label: 'Esta semana',    value: fmt(metrics.revenueThisWeek) },
              { label: 'Este mes',       value: fmt(metrics.revenueThisMonth) },
              { label: 'Total histórico',value: fmt(metrics.revenueLifetime) },
            ].map((kpi) => (
              <article key={kpi.label} className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/[0.03]">
                <p className="text-[11px] font-normal leading-none text-neutral-400">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">
                  {kpi.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Operations + Occupancy KPIs ── */}
        <section>
          <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">Operaciones y ocupación</h2>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {[
              { label: 'En estancia',        value: String(metrics.currentlyCheckedIn) },
              { label: 'Llegadas hoy',        value: String(metrics.todayArrivals) },
              { label: 'Salidas hoy',         value: String(metrics.todayDepartures) },
              { label: 'Ocupación este mes',  value: fmtPct(metrics.occupancyThisMonth) },
              { label: 'Ocupación este año',  value: fmtPct(metrics.occupancyThisYear) },
            ].map((kpi) => (
              <article key={kpi.label} className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/[0.03]">
                <p className="text-[11px] font-normal leading-none text-neutral-400">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">
                  {kpi.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Revenue Chart ── */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Ingresos confirmados</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Pagos procesados por período. Solo reservas pagadas.</p>
            </div>
            <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
              {(Object.keys(PERIOD_LABELS) as ChartPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setChartPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    chartPeriod === p
                      ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/[0.05]'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[260px] w-full">
            {rechartsMod && activeChartData.length > 0 ? (
              <RevenueChart recharts={rechartsMod} data={activeChartData} fmt={fmt} />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-neutral-50">
                <p className="text-sm text-neutral-400">Sin datos para este período.</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Cabin Performance + Opportunities ── */}
        <section className="grid gap-6 xl:grid-cols-3">

          {/* Cabin performance table */}
          <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03] xl:col-span-2">
            <h2 className="text-base font-semibold text-neutral-900">Rendimiento por cabaña</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Ingresos totales, reservas confirmadas y ocupación este mes.</p>
            <div className="mt-5 overflow-x-auto">
              {metrics.cabinPerformance.length === 0 ? (
                <p className="text-sm text-neutral-400">Sin datos.</p>
              ) : (
                <table className="min-w-full divide-y divide-neutral-100 text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-neutral-400">
                      <th className="pb-3 pr-6 font-semibold">Cabaña</th>
                      <th className="pb-3 pr-6 font-semibold">Ingresos</th>
                      <th className="pb-3 pr-6 font-semibold">Reservas</th>
                      <th className="pb-3 font-semibold">Ocup. mes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {metrics.cabinPerformance.map((cabin) => (
                      <tr key={cabin.id} className="text-sm text-neutral-700">
                        <td className="py-3 pr-6 font-medium text-neutral-900">{cabin.name}</td>
                        <td className="py-3 pr-6 tabular-nums">{fmt(cabin.revenue)}</td>
                        <td className="py-3 pr-6 tabular-nums">{cabin.reservations}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(cabin.occupancyMonth * 100, 100)}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-xs">{fmtPct(cabin.occupancyMonth)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </article>

          {/* Opportunities */}
          <article className="rounded-3xl bg-neutral-50 p-6 shadow-sm ring-1 ring-neutral-200/70">
            <h2 className="text-base font-semibold text-neutral-900">Oportunidades</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Análisis automático de tu operación.</p>
            <ul className="mt-5 space-y-4">
              {insights.map((insight, i) => (
                <li key={i} className={`flex gap-3 ${i > 0 ? 'border-t border-neutral-200/70 pt-4' : ''}`}>
                  <InsightIcon tone={insight.tone} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900">{insight.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-600">{insight.explanation}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* ── Recent Paid Reservations ── */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Reservas recientes</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Últimas 6 reservas confirmadas o activas.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/reservations')}
              className="text-xs font-semibold text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
            >
              Ver todas →
            </button>
          </div>
          {recent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-100 text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-neutral-400">
                    <th className="pb-3 pr-4 font-semibold">Huésped</th>
                    <th className="pb-3 pr-4 font-semibold">Cabaña</th>
                    <th className="pb-3 pr-4 font-semibold">Check-in</th>
                    <th className="pb-3 pr-4 font-semibold">Estado</th>
                    <th className="pb-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {recent.map((r) => (
                    <tr
                      key={r.id}
                      className="cursor-pointer text-sm text-neutral-700 hover:bg-neutral-50"
                      onClick={() => router.push(`/reservations/${r.id}`)}
                    >
                      <td className="py-3 pr-4 font-medium text-neutral-900">
                        {r.guest.firstName} {r.guest.lastName}
                      </td>
                      <td className="py-3 pr-4 text-neutral-600">{r.roomType.name}</td>
                      <td className="py-3 pr-4 text-neutral-500">{r.checkInDate.slice(0, 10)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${reservationStatusClasses[r.status] ?? 'bg-neutral-100 text-neutral-700'}`}>
                          {reservationStatusLabel[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-neutral-900 tabular-nums">
                        {fmt(Number(r.totalAmount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl bg-neutral-100 px-6 py-10 text-center text-sm text-neutral-500">
              No hay reservas confirmadas aún.
            </div>
          )}
        </section>

      </div>
    </AdminShell>
  );
}
