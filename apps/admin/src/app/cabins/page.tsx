'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../components/admin/AdminShell';
import { apiFetch } from '../../lib/api';

type CabinImage = { url: string; altText: string | null };

type Cabin = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: string;
  capacityAdults: number;
  capacityChildren: number;
  status: string;
  images?: CabinImage[];
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Activa',
  MAINTENANCE: 'Mantenimiento',
  HIDDEN: 'Oculta',
};

const statusStyle: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  MAINTENANCE: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  HIDDEN: 'bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200/60',
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function CabinHeroPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
      <span className="text-3xl font-semibold tracking-tight text-neutral-400">
        {initials}
      </span>
    </div>
  );
}

export default function CabinsPage() {
  const router = useRouter();
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('fu_admin_token');
    if (!token) { router.push('/login'); return; }

    apiFetch<Cabin[]>('/admin/room-types')
      .then(setCabins)
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === 'Request failed') {
          localStorage.removeItem('fu_admin_token');
          localStorage.removeItem('fu_admin_user');
          router.push('/login');
        } else {
          setError('No se pudieron cargar las cabañas.');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const activeCabins = cabins.filter((c) => c.status === 'ACTIVE').length;
  const maintenanceCabins = cabins.filter((c) => c.status === 'MAINTENANCE').length;

  return (
    <AdminShell
      title="Cabañas"
      subtitle="Gestiona tus propiedades: imágenes, precios, capacidad y disponibilidad."
    >
      {/* Summary row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total cabañas', value: cabins.length },
          { label: 'Activas', value: activeCabins },
          { label: 'Mantenimiento', value: maintenanceCabins },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/[0.03]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              {kpi.label}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-neutral-900">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-[360px] animate-pulse rounded-3xl bg-neutral-200"
            />
          ))}
        </div>
      ) : cabins.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-8 py-16 text-center">
          <p className="text-base font-semibold text-neutral-700">
            Sin cabañas configuradas
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Las cabañas se configuran desde el panel de operaciones de la API.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cabins.map((cabin) => {
            const heroImage = cabin.images?.[0]?.url;
            return (
              <article
                key={cabin.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
              >
                {/* Image */}
                <div className="relative h-52 shrink-0 overflow-hidden bg-neutral-100">
                  {heroImage ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.04]"
                      style={{ backgroundImage: `url(${heroImage})` }}
                      aria-hidden
                    />
                  ) : (
                    <CabinHeroPlaceholder name={cabin.name} />
                  )}

                  {/* Status badge — overlaid */}
                  <div className="absolute left-3 top-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        statusStyle[cabin.status] ??
                        'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {statusLabel[cabin.status] ?? cabin.status}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                    {cabin.name}
                  </h2>

                  {cabin.description ? (
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-500">
                      {cabin.description}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-600">
                      {cabin.capacityAdults} adultos
                    </span>
                    {cabin.capacityChildren > 0 && (
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-600">
                        {cabin.capacityChildren} menores
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-5">
                    <p className="text-xl font-semibold tabular-nums text-neutral-900">
                      {formatCurrency(cabin.basePrice)}
                      <span className="ml-1 text-xs font-normal text-neutral-400">
                        / noche
                      </span>
                    </p>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/cabins/${cabin.id}`)}
                        className="flex-1 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.98]"
                      >
                        Editar cabaña
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push('/calendar')}
                        className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                        title="Ver en calendario"
                      >
                        📅
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
