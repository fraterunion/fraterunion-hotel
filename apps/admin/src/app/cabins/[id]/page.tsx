'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminShell from '../../../components/admin/AdminShell';
import { apiFetch } from '../../../lib/api';

type CabinImage = { url: string; altText: string | null };

type Cabin = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: string;
  capacityAdults: number;
  capacityChildren: number;
  bedType: string | null;
  sizeM2: number | null;
  status: string;
  images?: CabinImage[];
};

const STATUSES = [
  { value: 'ACTIVE', label: 'Activa', description: 'Visible y disponible para reservas' },
  { value: 'MAINTENANCE', label: 'Mantenimiento', description: 'No disponible temporalmente' },
  { value: 'HIDDEN', label: 'Oculta', description: 'No aparece en el catálogo público' },
];

const inputCls =
  'w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10';

const labelCls =
  'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-5 border-b border-neutral-100 pb-4">
        <h2 className="text-base font-semibold tracking-tight text-neutral-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function CabinEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [cabin, setCabin] = useState<Cabin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacityAdults, setCapacityAdults] = useState(2);
  const [capacityChildren, setCapacityChildren] = useState(0);
  const [basePrice, setBasePrice] = useState('');
  const [extraPersonFee, setExtraPersonFee] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  useEffect(() => {
    const token = localStorage.getItem('fu_admin_token');
    if (!token) { router.push('/login'); return; }

    apiFetch<Cabin[]>('/admin/room-types')
      .then((cabins) => {
        const found = cabins.find((c) => c.id === id);
        if (!found) { router.push('/cabins'); return; }
        setCabin(found);
        setName(found.name);
        setDescription(found.description ?? '');
        setCapacityAdults(found.capacityAdults);
        setCapacityChildren(found.capacityChildren);
        setBasePrice(found.basePrice);
        setStatus(found.status);
      })
      .catch(() => router.push('/cabins'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      await apiFetch(`/admin/room-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          description,
          capacityAdults: Number(capacityAdults),
          capacityChildren: Number(capacityChildren),
          basePrice: Number(basePrice),
          status,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Cargando…">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-neutral-200" />
          ))}
        </div>
      </AdminShell>
    );
  }

  if (!cabin) return null;

  return (
    <AdminShell
      title={cabin.name}
      subtitle={`Editando cabaña · ${cabin.slug}`}
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Gallery */}
        <Section
          title="Galería"
          description="Imágenes de la cabaña mostradas en el catálogo público."
        >
          {cabin.images && cabin.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {cabin.images.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${img.url})` }}
                    aria-hidden
                  />
                  {i === 0 && (
                    <div className="absolute bottom-2 left-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Portada
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
              <p className="text-sm font-medium text-neutral-600">
                Sin imágenes cargadas
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Las imágenes se gestionan desde la API. La carga directa estará disponible próximamente.
              </p>
            </div>
          )}
        </Section>

        {/* Basic Info */}
        <Section
          title="Información básica"
          description="Nombre y descripción que verán los huéspedes."
        >
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nombre de la cabaña</label>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Casa Grande"
              />
            </div>

            <div>
              <label className={labelCls}>Descripción</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Una cabaña con ambiente cálido, chimenea y terraza privada…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Adultos máx.</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputCls}
                  value={capacityAdults}
                  onChange={(e) => setCapacityAdults(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Menores máx.</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  className={inputCls}
                  value={capacityChildren}
                  onChange={(e) => setCapacityChildren(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Pricing */}
        <Section
          title="Precios"
          description="Tarifa base por noche. Los ajustes de temporada se configuran desde la API."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Tarifa base (MXN / noche)</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  className={`${inputCls} pl-8`}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Cargo por persona adicional
                <span className="ml-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] text-neutral-400">
                  próximamente
                </span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  className={`${inputCls} pl-8 opacity-50`}
                  value={extraPersonFee}
                  onChange={(e) => setExtraPersonFee(e.target.value)}
                  disabled
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Status */}
        <Section
          title="Estado de la cabaña"
          description="Controla la visibilidad y disponibilidad en el catálogo."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={[
                  'rounded-2xl border p-4 text-left transition',
                  status === s.value
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50',
                ].join(' ')}
              >
                <p className="text-sm font-semibold">{s.label}</p>
                <p
                  className={`mt-0.5 text-xs ${status === s.value ? 'text-neutral-400' : 'text-neutral-500'}`}
                >
                  {s.description}
                </p>
              </button>
            ))}
          </div>
        </Section>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-neutral-900 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60 sm:w-auto"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/cabins')}
            className="w-full rounded-2xl border border-neutral-300 bg-white px-8 py-3.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 sm:w-auto"
          >
            Cancelar
          </button>

          {saveSuccess && (
            <span className="text-sm font-medium text-emerald-600">
              ✓ Cambios guardados
            </span>
          )}
          {saveError && (
            <span className="text-sm font-medium text-red-600">{saveError}</span>
          )}
        </div>
      </form>
    </AdminShell>
  );
}
