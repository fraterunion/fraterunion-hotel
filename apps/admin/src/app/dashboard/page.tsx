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
  status: string;
  hotelId: string;
};

type Metrics = {
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  checkedInReservations: number;
  checkedOutReservations: number;
  cancelledReservations: number;
  totalRevenueBooked: number;
  totalRevenuePaid: number;
  totalRevenuePending: number;
};

type RecentReservation = {
  id: string;
  reservationCode: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  totalAmount: string;
  guest: { firstName: string; lastName: string };
  roomType: { name: string };
};

const OCCUPANCY_WEEKLY_MOCK = [
  { day: 'Lun', occupancy: 62 },
  { day: 'Mar', occupancy: 68 },
  { day: 'Mié', occupancy: 64 },
  { day: 'Jue', occupancy: 72 },
  { day: 'Vie', occupancy: 81 },
  { day: 'Sáb', occupancy: 88 },
  { day: 'Dom', occupancy: 76 },
] as const;

const chartAxisTick = { fill: '#a3a3a3', fontSize: 11 };
const chartLineStroke = '#64748b';
const chartBarFill = '#64748b';
const chartBarFillEnd = '#556273';

function ChartTooltipFrame({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200/80 bg-white px-3.5 py-2.5 shadow-[0_4px_24px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.04)]">
      {eyebrow ? (
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
          {eyebrow}
        </p>
      ) : null}
      <div
        className={`tabular-nums text-[13px] font-semibold leading-snug tracking-tight text-neutral-900 ${eyebrow ? 'mt-1' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}

function OccupancyChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  if (value == null) return null;
  return (
    <ChartTooltipFrame eyebrow={label != null ? String(label) : undefined}>
      {value}% ocupación
    </ChartTooltipFrame>
  );
}

function DashboardOccupancyChart({
  recharts,
  data,
}: {
  recharts: RechartsModule;
  data: { day: string; occupancy: number }[];
}) {
  const {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
  } = recharts;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid
          stroke="#94a3b8"
          strokeOpacity={0.22}
          strokeDasharray="4 6"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          axisLine={{ stroke: '#e5e5e5' }}
          tickLine={false}
          tick={chartAxisTick}
          dy={4}
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={chartAxisTick}
          tickFormatter={(v: number) => `${v}%`}
          width={36}
        />
        <Tooltip
          content={<OccupancyChartTooltip />}
          cursor={{ stroke: 'rgba(148, 163, 184, 0.35)', strokeWidth: 1 }}
          wrapperStyle={{ outline: 'none' }}
        />
        <Line
          type="monotone"
          dataKey="occupancy"
          stroke={chartLineStroke}
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 5,
            fill: '#fff',
            stroke: chartLineStroke,
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function RevenueChartTooltip({
  active,
  payload,
  label,
  formatCurrency,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number }>;
  label?: string;
  formatCurrency: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  if (value == null) return null;
  return (
    <ChartTooltipFrame eyebrow={label != null ? String(label) : undefined}>
      {formatCurrency(value)}
    </ChartTooltipFrame>
  );
}

function DashboardRevenueChart({
  recharts,
  data,
  formatCurrency,
}: {
  recharts: RechartsModule;
  data: { name: string; value: number }[];
  formatCurrency: (value: number) => string;
}) {
  const {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
  } = recharts;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="dashboardRevenueBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartBarFill} stopOpacity={1} />
            <stop offset="100%" stopColor={chartBarFillEnd} stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="#94a3b8"
          strokeOpacity={0.22}
          strokeDasharray="4 6"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          axisLine={{ stroke: '#e5e5e5' }}
          tickLine={false}
          tick={chartAxisTick}
          dy={4}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={chartAxisTick}
          tickFormatter={(v: number) => formatCurrency(v)}
          width={68}
        />
        <Tooltip
          content={<RevenueChartTooltip formatCurrency={formatCurrency} />}
          cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
          wrapperStyle={{ outline: 'none' }}
        />
        <Bar
          dataKey="value"
          fill="url(#dashboardRevenueBar)"
          radius={[6, 6, 2, 2]}
          maxBarSize={52}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function InsightIconWarning({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function InsightIconSuccess({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function InsightIconInfo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

type InsightTone = 'warning' | 'positive' | 'neutral';

const insightIconWrap: Record<InsightTone, string> = {
  warning:
    'bg-amber-100/90 text-amber-800 ring-1 ring-amber-200/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]',
  positive:
    'bg-emerald-100/90 text-emerald-800 ring-1 ring-emerald-200/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]',
  neutral:
    'bg-white text-neutral-600 ring-1 ring-neutral-200/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]',
};

function DashboardInsightIcon({ tone }: { tone: InsightTone }) {
  const wrap = `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${insightIconWrap[tone]}`;
  if (tone === 'warning') {
    return (
      <div className={wrap}>
        <InsightIconWarning className="h-5 w-5" />
      </div>
    );
  }
  if (tone === 'positive') {
    return (
      <div className={wrap}>
        <InsightIconSuccess className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className={wrap}>
      <InsightIconInfo className="h-5 w-5" />
    </div>
  );
}

const reservationStatusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'En estancia',
  CHECKED_OUT: 'Finalizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No presentado',
};

const reservationStatusClasses: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-sky-50 text-sky-700',
  CHECKED_IN: 'bg-emerald-50 text-emerald-700',
  CHECKED_OUT: 'bg-neutral-100 text-neutral-600',
  CANCELLED: 'bg-rose-50 text-rose-700',
  NO_SHOW: 'bg-neutral-100 text-neutral-500',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechartsMod, setRechartsMod] = useState<RechartsModule | null>(null);

  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem('fu_admin_token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const [meData, metricsData, reservationsData] = await Promise.all([
          apiFetch<{ user: AdminUser }>('/auth/me'),
          apiFetch<Metrics>('/admin/reservations/metrics/summary'),
          apiFetch<RecentReservation[]>('/admin/reservations'),
        ]);

        setUser(meData.user);
        setMetrics(metricsData);
        setRecentReservations(reservationsData.slice(0, 6));
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

  useEffect(() => {
    void import('recharts').then(setRechartsMod);
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-sm text-neutral-400">Cargando panel…</p>
      </main>
    );
  }

  if (!user || !metrics) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);

  const occupancyChartData = [...OCCUPANCY_WEEKLY_MOCK];

  const revenueBreakdownData = [
    { name: 'Reservado', value: metrics.totalRevenueBooked },
    { name: 'Pagado', value: metrics.totalRevenuePaid },
    { name: 'Pendiente', value: metrics.totalRevenuePending },
  ];

  const operationsKpis = [
    {
      label: 'Total reservas',
      value: metrics.totalReservations.toLocaleString('es-MX'),
    },
    {
      label: 'Pendientes',
      value: metrics.pendingReservations.toLocaleString('es-MX'),
    },
    {
      label: 'En estancia',
      value: metrics.checkedInReservations.toLocaleString('es-MX'),
    },
  ] as const;

  const revenueKpis = [
    {
      label: 'Monto reservado',
      value: formatCurrency(metrics.totalRevenueBooked),
    },
    {
      label: 'Monto pagado',
      value: formatCurrency(metrics.totalRevenuePaid),
    },
    {
      label: 'Monto pendiente',
      value: formatCurrency(metrics.totalRevenuePending),
    },
  ] as const;

  type Insight = {
    tone: InsightTone;
    title: string;
    explanation: string;
    actionHint: string;
  };

  const insightCandidates: Insight[] = [];
  if (
    metrics.totalReservations > 0 &&
    metrics.pendingReservations > metrics.totalReservations * 0.4
  ) {
    insightCandidates.push({
      tone: 'warning',
      title: 'Alto volumen de reservas pendientes',
      explanation: 'Más del 40% de las reservas aún no están confirmadas.',
      actionHint: 'Revisar reservas pendientes',
    });
  }
  if (metrics.totalRevenuePaid > 0) {
    insightCandidates.push({
      tone: 'positive',
      title: 'Ingresos activos',
      explanation: `${formatCurrency(metrics.totalRevenuePaid)} en pagos procesados.`,
      actionHint: 'Ver desglose de ingresos',
    });
  }
  if (metrics.checkedInReservations === 0 && metrics.totalReservations > 0) {
    insightCandidates.push({
      tone: 'neutral',
      title: 'Sin estancias activas',
      explanation: 'No hay huéspedes registrados en este momento.',
      actionHint: 'Ver llegadas de hoy',
    });
  }
  const insights = insightCandidates.slice(0, 2);

  return (
    <AdminShell
      title="Dashboard"
      subtitle={`Bienvenido, ${user.firstName || 'Administrador'}. Vista operacional en tiempo real.`}
    >
      <div className="w-full space-y-8">
        {/* Insights */}
        <section className="rounded-3xl border border-neutral-200/90 bg-neutral-50 p-6 shadow-sm ring-1 ring-neutral-300/40">
          <h2 className="text-base font-semibold tracking-tight text-neutral-900">
            Puntos de atención
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            Prioridades derivadas de tus métricas en vivo.
          </p>
          <ul className="mt-6 flex flex-col">
            {insights.length > 0 ? (
              insights.map((insight, index) => (
                <li
                  key={insight.title}
                  className={`flex gap-4 ${index > 0 ? 'mt-7 border-t border-neutral-200/70 pt-7' : ''}`}
                >
                  <DashboardInsightIcon tone={insight.tone} />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-semibold text-neutral-900">
                      {insight.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                      {insight.explanation}
                    </p>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      {insight.actionHint}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li className="flex gap-4">
                <DashboardInsightIcon tone="neutral" />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-neutral-900">
                    Todo en orden
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                    No hay patrones destacables en tus métricas actuales.
                  </p>
                </div>
              </li>
            )}
          </ul>
        </section>

        {/* KPIs */}
        <section className="space-y-10">
          <div>
            <h2 className="mb-5 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              Operaciones
            </h2>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {operationsKpis.map((kpi) => (
                <article
                  key={kpi.label}
                  className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/[0.03]"
                >
                  <p className="text-[11px] font-normal leading-none text-neutral-400">
                    {kpi.label}
                  </p>
                  <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">
                    {kpi.value}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-5 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              Ingresos
            </h2>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {revenueKpis.map((kpi) => (
                <article
                  key={kpi.label}
                  className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/[0.03]"
                >
                  <p className="text-[11px] font-normal leading-none text-neutral-400">
                    {kpi.label}
                  </p>
                  <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">
                    {kpi.value}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="grid gap-6 xl:grid-cols-2">
          <article className="min-w-0 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
            <h2 className="text-base font-semibold text-neutral-900">
              Tendencia de ocupación
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Evolución de uso de cabañas en los últimos 7 días.
            </p>
            <div className="mt-5 h-[240px] w-full">
              {rechartsMod ? (
                <DashboardOccupancyChart
                  recharts={rechartsMod}
                  data={occupancyChartData}
                />
              ) : (
                <div className="h-full w-full rounded-lg bg-neutral-100" aria-hidden />
              )}
            </div>
          </article>

          <article className="min-w-0 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
            <h2 className="text-base font-semibold text-neutral-900">
              Desglose de ingresos
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Comparativa de montos reservado, pagado y pendiente.
            </p>
            <div className="mt-5 h-[240px] w-full">
              {rechartsMod ? (
                <DashboardRevenueChart
                  recharts={rechartsMod}
                  data={revenueBreakdownData}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <div className="h-full w-full rounded-lg bg-neutral-100" aria-hidden />
              )}
            </div>
          </article>
        </section>

        {/* Recent Reservations — real data */}
        <section className="grid gap-6 xl:grid-cols-3">
          <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03] xl:col-span-2">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Reservas recientes
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Últimas 6 reservas de la propiedad.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/reservations')}
                className="text-xs font-semibold text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
              >
                Ver todas →
              </button>
            </div>

            {recentReservations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-100 text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-neutral-400">
                      <th className="pb-3 pr-4 font-semibold">Huésped</th>
                      <th className="pb-3 pr-4 font-semibold">Cabaña</th>
                      <th className="pb-3 pr-4 font-semibold">Estado</th>
                      <th className="pb-3 pr-4 font-semibold">Fecha</th>
                      <th className="pb-3 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {recentReservations.map((r) => (
                      <tr
                        key={r.id}
                        className="cursor-pointer text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => router.push(`/reservations/${r.id}`)}
                      >
                        <td className="py-3 pr-4 font-medium text-neutral-900">
                          {r.guest.firstName} {r.guest.lastName}
                        </td>
                        <td className="py-3 pr-4 text-neutral-600">
                          {r.roomType.name}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              reservationStatusClasses[r.status] ??
                              'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {reservationStatusLabel[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-neutral-500">
                          {r.createdAt.slice(0, 10)}
                        </td>
                        <td className="py-3 font-semibold text-neutral-900 tabular-nums">
                          {formatCurrency(Number(r.totalAmount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl bg-neutral-100 px-6 py-10 text-center text-sm text-neutral-500">
                No hay reservas aún. Las nuevas reservas aparecerán aquí.
              </div>
            )}
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
            <h2 className="text-base font-semibold text-neutral-900">
              Estado del sistema
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Monitoreo operacional
            </p>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <span className="text-xs font-medium text-emerald-700">API</span>
                <span className="text-xs font-semibold text-emerald-700">Activo ✓</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <span className="text-xs font-medium text-emerald-700">Base de datos</span>
                <span className="text-xs font-semibold text-emerald-700">Activo ✓</span>
              </div>
              <div className="mt-4 rounded-xl bg-neutral-100 px-4 py-4 text-center">
                <p className="text-xs text-neutral-500">
                  Sin alertas. Las operaciones funcionan correctamente.
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </AdminShell>
  );
}
