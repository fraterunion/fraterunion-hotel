'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../../components/admin/AdminShell';
import { apiFetch } from '../../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type FunnelStep = { label: string; value: number };

type TopCabin = {
  roomTypeId: string;
  name: string;
  views: number;
  selections: number;
  payments: number;
  revenue: number;
};

type Overview = {
  status: 'ready' | 'empty' | 'not_ready';
  message?: string;
  range: { from: string; to: string };
  kpis: {
    conversations: number;
    availabilityShown: number;
    cabinInfoViews: number;
    cabinsSelected: number;
    checkoutLinksGenerated: number;
    paymentsCompleted: number;
    revenue: number;
    conversionRate: number;
  };
  funnel: FunnelStep[];
  topCabins: TopCabin[];
  followUps: {
    sent: number;
    recoveredPayments: number;
    recoveredRevenue: number;
  };
};

// ── Date range presets ────────────────────────────────────────────────────────

type Preset = '7d' | '30d' | '90d';

function getPresetDates(preset: Preset): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (preset === '7d') from.setDate(from.getDate() - 6);
  else if (preset === '30d') from.setDate(from.getDate() - 29);
  else from.setDate(from.getDate() - 89);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtMXN = (v: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(v);

const fmtNum = (v: number) => new Intl.NumberFormat('es-MX').format(v);

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl px-5 py-4 shadow-sm ring-1 ${
        accent
          ? 'bg-neutral-900 ring-neutral-800'
          : 'bg-white ring-black/[0.03]'
      }`}
    >
      <p
        className={`text-[11px] font-normal leading-none ${
          accent ? 'text-neutral-400' : 'text-neutral-400'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums ${
          accent ? 'text-white' : 'text-neutral-900'
        }`}
      >
        {value}
      </p>
      {sub ? (
        <p
          className={`mt-1.5 text-xs leading-none ${
            accent ? 'text-neutral-500' : 'text-neutral-400'
          }`}
        >
          {sub}
        </p>
      ) : null}
    </article>
  );
}

// ── Funnel ────────────────────────────────────────────────────────────────────

function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const maxVal = steps[0]?.value ?? 0;

  if (maxVal === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-neutral-50 py-10">
        <p className="text-sm text-neutral-400">Sin datos para este período.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {steps.map((step, i) => {
        const pct = maxVal > 0 ? Math.round((step.value / maxVal) * 100) : 0;
        const prevVal = i > 0 ? steps[i - 1].value : step.value;
        const dropOff =
          i > 0 && prevVal > 0
            ? Math.round(((prevVal - step.value) / prevVal) * 100)
            : null;

        return (
          <div key={step.label}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-neutral-700">{step.label}</span>
              <div className="flex items-center gap-2">
                {dropOff !== null && dropOff > 0 ? (
                  <span className="text-xs text-rose-500">−{dropOff}%</span>
                ) : null}
                <span className="min-w-[2.5rem] text-right text-sm font-semibold tabular-nums text-neutral-900">
                  {fmtNum(step.value)}
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  i === 0
                    ? 'bg-neutral-700'
                    : i === steps.length - 1
                      ? 'bg-emerald-500'
                      : 'bg-neutral-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AiConciergeAnalyticsPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [preset, setPreset] = useState<Preset>('30d');

  useEffect(() => {
    const token = localStorage.getItem('fu_admin_token');
    if (!token) { router.push('/login'); return; }

    const { from, to } = getPresetDates(preset);
    setLoading(true);
    setError(false);

    apiFetch<Overview>(
      `/admin/analytics/ai-concierge/overview?from=${from}&to=${to}`,
    )
      .then(setOverview)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [router, preset]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminShell
        title="AI Concierge Analytics"
        subtitle="Mide conversaciones, reservas y revenue generado por el asistente de WhatsApp."
      >
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-neutral-400">Cargando analytics…</p>
        </div>
      </AdminShell>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !overview) {
    return (
      <AdminShell
        title="AI Concierge Analytics"
        subtitle="Mide conversaciones, reservas y revenue generado por el asistente de WhatsApp."
      >
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-black/[0.03]">
          <p className="text-sm font-medium text-neutral-500">
            No se pudieron cargar los analytics. Intenta de nuevo.
          </p>
          <button
            type="button"
            onClick={() => setPreset(preset)}
            className="mt-4 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      </AdminShell>
    );
  }

  const { status, message, kpis, funnel, topCabins, followUps } = overview;

  // ── Preset selector ──────────────────────────────────────────────────────
  const presetSelector = (
    <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
      {(['7d', '30d', '90d'] as Preset[]).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => setPreset(p)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            preset === p
              ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/[0.05]'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          {p === '7d' ? 'Últimos 7 días' : p === '30d' ? 'Últimos 30 días' : 'Últimos 90 días'}
        </button>
      ))}
    </div>
  );

  return (
    <AdminShell
      title="AI Concierge Analytics"
      subtitle="Mide conversaciones, reservas y revenue generado por el asistente de WhatsApp."
    >
      <div className="w-full space-y-8">

        {/* ── Date range selector ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {presetSelector}
          <p className="text-xs text-neutral-400">
            {overview.range.from} → {overview.range.to}
          </p>
        </div>

        {/* ── Not ready state ── */}
        {status === 'not_ready' ? (
          <div className="rounded-3xl border border-amber-100 bg-amber-50 px-8 py-16 text-center shadow-sm ring-1 ring-amber-200/60">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
              <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-amber-900">Analytics todavía no está listo</p>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
              Activa <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">ANALYTICS_ENABLED=true</code> y confirma que la migración{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">bot_events</code> esté aplicada en producción.
            </p>
          </div>
        ) : status === 'empty' ? (
          <div className="rounded-3xl bg-white px-8 py-16 text-center shadow-sm ring-1 ring-black/[0.03]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
              <svg className="h-6 w-6 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-700">Sin datos todavía</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
              {message ?? 'Los analytics aparecerán aquí cuando el bot empiece a recibir conversaciones.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── KPI cards ── */}
            <section>
              <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                Resumen del período
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard
                  label="Conversaciones"
                  value={fmtNum(kpis.conversations)}
                />
                <KpiCard
                  label="Links de pago"
                  value={fmtNum(kpis.checkoutLinksGenerated)}
                />
                <KpiCard
                  label="Pagos completados"
                  value={fmtNum(kpis.paymentsCompleted)}
                />
                <KpiCard
                  label="Revenue generado"
                  value={fmtMXN(kpis.revenue)}
                  accent
                />
                <KpiCard
                  label="Tasa de conversión"
                  value={`${kpis.conversionRate}%`}
                  sub="conversaciones → pagos"
                />
              </div>
            </section>

            {/* ── Funnel + Follow-ups ── */}
            <section className="grid gap-6 xl:grid-cols-3">

              {/* Funnel */}
              <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03] xl:col-span-2">
                <h2 className="text-base font-semibold text-neutral-900">
                  Embudo de conversión
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Porcentaje de retención en cada paso del flujo de WhatsApp.
                </p>
                <div className="mt-6">
                  <FunnelChart steps={funnel} />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-5 sm:grid-cols-4">
                  {[
                    { label: 'Disponibilidad', value: kpis.availabilityShown },
                    { label: 'Info vista', value: kpis.cabinInfoViews },
                    { label: 'Cab. seleccionada', value: kpis.cabinsSelected },
                    { label: 'Links generados', value: kpis.checkoutLinksGenerated },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">{s.label}</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-800">{fmtNum(s.value)}</p>
                    </div>
                  ))}
                </div>
              </article>

              {/* Follow-up recovery */}
              <article className="rounded-3xl bg-neutral-50 p-6 shadow-sm ring-1 ring-neutral-200/70">
                <h2 className="text-base font-semibold text-neutral-900">
                  Follow-up recovery
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Pagos recuperados tras envío de recordatorio por WhatsApp.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                      Follow-ups enviados
                    </p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums text-neutral-900">
                      {fmtNum(followUps.sent)}
                    </p>
                  </div>

                  <div className="border-t border-neutral-200/80 pt-4">
                    {followUps.recoveredPayments > 0 ? (
                      <>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                            Pagos recuperados
                          </p>
                          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
                            {fmtNum(followUps.recoveredPayments)}
                          </p>
                        </div>
                        <div className="mt-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                            Revenue recuperado
                          </p>
                          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
                            {fmtMXN(followUps.recoveredRevenue)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs leading-relaxed text-neutral-400">
                        Recovery attribution coming soon.
                        <br />
                        Se mostrará cuando haya pagos completados tras un follow-up.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            </section>

            {/* ── Top Cabins ── */}
            {topCabins.length > 0 ? (
              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
                <h2 className="text-base font-semibold text-neutral-900">
                  Rendimiento por cabaña
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Basado en eventos del bot: vistas, selecciones y pagos en WhatsApp.
                </p>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-100 text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-neutral-400">
                        <th className="pb-3 pr-6 font-semibold">Cabaña</th>
                        <th className="pb-3 pr-6 font-semibold">Vistas</th>
                        <th className="pb-3 pr-6 font-semibold">Selecciones</th>
                        <th className="pb-3 pr-6 font-semibold">Pagos</th>
                        <th className="pb-3 font-semibold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {topCabins.map((cabin) => (
                        <tr key={cabin.roomTypeId} className="text-sm text-neutral-700">
                          <td className="py-3 pr-6 font-medium text-neutral-900">
                            {cabin.name}
                          </td>
                          <td className="py-3 pr-6 tabular-nums">{fmtNum(cabin.views)}</td>
                          <td className="py-3 pr-6 tabular-nums">{fmtNum(cabin.selections)}</td>
                          <td className="py-3 pr-6 tabular-nums">{fmtNum(cabin.payments)}</td>
                          <td className="py-3 font-semibold tabular-nums text-neutral-900">
                            {cabin.revenue > 0 ? fmtMXN(cabin.revenue) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}
