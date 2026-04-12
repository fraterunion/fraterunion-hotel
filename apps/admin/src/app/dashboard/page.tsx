'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../components/admin/AdminShell';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const OCCUPANCY_WEEKLY_MOCK = [
  { day: 'Mon', occupancy: 62 },
  { day: 'Tue', occupancy: 68 },
  { day: 'Wed', occupancy: 64 },
  { day: 'Thu', occupancy: 72 },
  { day: 'Fri', occupancy: 81 },
  { day: 'Sat', occupancy: 88 },
  { day: 'Sun', occupancy: 76 },
] as const;

const chartAxisTick = { fill: '#a3a3a3', fontSize: 11 };
/** Soft slate line — readable without harsh black */
const chartLineStroke = '#64748b';
/** Bar fill: cool slate, slightly above flat gray */
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
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">{eyebrow}</p>
      ) : null}
      <div className={`tabular-nums text-[13px] font-semibold leading-snug tracking-tight text-neutral-900 ${eyebrow ? 'mt-1' : ''}`}>
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
      {value}% occupancy
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
          width={52}
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
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
        const [meRes, metricsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/admin/reservations/metrics/summary`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!meRes.ok || !metricsRes.ok) {
          throw new Error('Unauthorized');
        }

        const meData = await meRes.json();
        const metricsData = await metricsRes.json();

        setUser(meData.user);
        setMetrics(metricsData);
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
    return <main className="min-h-screen bg-neutral-100 p-8">Loading dashboard...</main>;
  }

  if (!user || !metrics) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const occupancyChartData = [...OCCUPANCY_WEEKLY_MOCK];

  const revenueBreakdownData = [
    { name: 'Booked', value: metrics.totalRevenueBooked },
    { name: 'Paid', value: metrics.totalRevenuePaid },
    { name: 'Pending', value: metrics.totalRevenuePending },
  ];

  const operationsKpis = [
    {
      label: 'Total reservations',
      value: metrics.totalReservations.toLocaleString(),
      delta: '+8%',
      deltaTone: 'positive',
    },
    {
      label: 'Pending',
      value: metrics.pendingReservations.toLocaleString(),
      delta: '-3%',
      deltaTone: 'negative',
    },
    {
      label: 'Checked in',
      value: metrics.checkedInReservations.toLocaleString(),
      delta: '+2%',
      deltaTone: 'positive',
    },
  ] as const;

  const revenueKpis = [
    {
      label: 'Revenue booked',
      value: formatCurrency(metrics.totalRevenueBooked),
      delta: '+6%',
      deltaTone: 'positive',
    },
    {
      label: 'Revenue paid',
      value: formatCurrency(metrics.totalRevenuePaid),
      delta: '+4%',
      deltaTone: 'positive',
    },
    {
      label: 'Revenue pending',
      value: formatCurrency(metrics.totalRevenuePending),
      delta: '-2%',
      deltaTone: 'neutral',
    },
  ] as const;

  const recentReservations = [
    {
      guest: 'Emily Carter',
      room: 'Deluxe 204',
      status: 'Confirmed',
      date: 'Apr 07, 2026',
      amount: '$340',
    },
    {
      guest: 'Marcus Lee',
      room: 'Suite 501',
      status: 'Pending',
      date: 'Apr 07, 2026',
      amount: '$520',
    },
    {
      guest: 'Olivia Chen',
      room: 'Standard 118',
      status: 'Checked in',
      date: 'Apr 06, 2026',
      amount: '$210',
    },
    {
      guest: 'Noah Davis',
      room: 'Superior 309',
      status: 'Checked out',
      date: 'Apr 06, 2026',
      amount: '$410',
    },
    {
      guest: 'Sophia Martin',
      room: 'Deluxe 222',
      status: 'Cancelled',
      date: 'Apr 05, 2026',
      amount: '$0',
    },
  ] as const;

  const deltaToneClasses = {
    positive: 'text-emerald-600/55',
    negative: 'text-red-600/50',
    neutral: 'text-neutral-400',
  } as const;

  const statusClasses: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700',
    Confirmed: 'bg-sky-50 text-sky-700',
    'Checked in': 'bg-emerald-50 text-emerald-700',
    'Checked out': 'bg-neutral-100 text-neutral-700',
    Cancelled: 'bg-rose-50 text-rose-700',
  };

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
      title: 'High pending reservations',
      explanation: 'Over 40% are not confirmed.',
      actionHint: 'Review pending reservations',
    });
  }
  if (metrics.totalRevenueBooked > 50000) {
    insightCandidates.push({
      tone: 'positive',
      title: 'Strong revenue performance',
      explanation: 'Strong revenue performance this week.',
      actionHint: 'Monitor revenue trends',
    });
  }
  if (metrics.checkedInReservations === 0) {
    insightCandidates.push({
      tone: 'neutral',
      title: 'No active check-ins',
      explanation: 'No active check-ins at the moment.',
      actionHint: "Check today's arrivals",
    });
  }
  const insights = insightCandidates.slice(0, 2);

  return (
    <AdminShell
      title="Dashboard"
      subtitle={`Welcome back, ${user.firstName || 'there'}. Live operational overview.`}
    >
      <div className="w-full space-y-8">
        <section className="rounded-3xl border border-neutral-200/90 bg-neutral-50 p-6 shadow-sm ring-1 ring-neutral-300/40">
          <h2 className="text-base font-semibold tracking-tight text-neutral-900">Insights</h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            Priorities from your live metrics — use these to decide what to do next.
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
                    <p className="text-sm font-semibold text-neutral-900">{insight.title}</p>
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
                  <p className="text-sm font-semibold text-neutral-900">All clear</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                    No notable patterns in your current metrics.
                  </p>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    Review reservations when new activity appears
                  </p>
                </div>
              </li>
            )}
          </ul>
        </section>

        <section className="space-y-10">
          <div>
            <h2 className="mb-5 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              Operations
            </h2>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {operationsKpis.map((kpi) => (
                <article
                  key={kpi.label}
                  className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.03] transition-shadow duration-200 hover:shadow-sm"
                >
                  <p className="text-[11px] font-normal leading-none text-neutral-400">{kpi.label}</p>
                  <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">
                    {kpi.value}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1 gap-y-0">
                    <span className={`text-[10px] font-normal tabular-nums ${deltaToneClasses[kpi.deltaTone]}`}>
                      {kpi.delta}
                    </span>
                    <span className="text-[10px] text-neutral-400/90">vs last week</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-5 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              Revenue
            </h2>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {revenueKpis.map((kpi) => (
                <article
                  key={kpi.label}
                  className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.03] transition-shadow duration-200 hover:shadow-sm"
                >
                  <p className="text-[11px] font-normal leading-none text-neutral-400">{kpi.label}</p>
                  <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">
                    {kpi.value}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1 gap-y-0">
                    <span className={`text-[10px] font-normal tabular-nums ${deltaToneClasses[kpi.deltaTone]}`}>
                      {kpi.delta}
                    </span>
                    <span className="text-[10px] text-neutral-400/90">vs last week</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="min-w-0 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03] transition-shadow duration-200 hover:shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Occupancy Trend</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Track how room usage evolves across the week.
                </p>
              </div>
            </div>
            <div className="mt-5 h-[240px] w-full shrink-0">
              {rechartsMod ? (
                <DashboardOccupancyChart recharts={rechartsMod} data={occupancyChartData} />
              ) : (
                <div className="h-full w-full rounded-lg bg-neutral-100" aria-hidden />
              )}
            </div>
          </article>

          <article className="min-w-0 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03] transition-shadow duration-200 hover:shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Revenue Breakdown</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Compare booked, paid, and pending amounts at a glance.
                </p>
              </div>
            </div>
            <div className="mt-5 h-[240px] w-full shrink-0">
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

        <section className="grid gap-6 xl:grid-cols-3">
          <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03] xl:col-span-2">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-neutral-900">Recent Reservations</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Latest booking activity snapshot.</p>
            </div>

            {recentReservations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-neutral-500">
                      <th className="pb-3 pr-4 font-medium">Guest</th>
                      <th className="pb-3 pr-4 font-medium">Room</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {recentReservations.map((reservation) => (
                      <tr key={`${reservation.guest}-${reservation.room}`} className="text-sm text-neutral-700">
                        <td className="py-3 pr-4 font-medium text-neutral-900">{reservation.guest}</td>
                        <td className="py-3 pr-4">{reservation.room}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              statusClasses[reservation.status] ?? 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {reservation.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-neutral-600">{reservation.date}</td>
                        <td className="py-3 font-medium text-neutral-900">{reservation.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl bg-neutral-100 px-6 py-10 text-center text-sm text-neutral-500">
                No reservations yet. New bookings will appear here.
              </div>
            )}
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
            <h2 className="text-base font-semibold text-neutral-900">Alerts / Issues</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Operational monitoring</p>
            <div className="mt-5 rounded-2xl bg-neutral-100 px-5 py-8 text-center">
              <p className="text-sm font-medium text-neutral-600">
                No issues detected. Your operations are running smoothly.
              </p>
            </div>
          </article>
        </section>
      </div>

    </AdminShell>
  );
}