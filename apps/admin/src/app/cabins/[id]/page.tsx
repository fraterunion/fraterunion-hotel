'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminShell from '../../../components/admin/AdminShell';
import { apiFetch } from '../../../lib/api';

type CabinImage = { id: string; url: string; altText: string | null; sortOrder: number };

type Cabin = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: string;
  lowOccupancyPrice: string | null;
  lowOccupancyThreshold: number | null;
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

  // Image management
  const [images, setImages] = useState<CabinImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [addingImage, setAddingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [imageError, setImageError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacityAdults, setCapacityAdults] = useState(2);
  const [capacityChildren, setCapacityChildren] = useState(0);
  const [basePrice, setBasePrice] = useState('');
  const [lowOccupancyPrice, setLowOccupancyPrice] = useState('');
  const [lowOccupancyThreshold, setLowOccupancyThreshold] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  useEffect(() => {
    const token = localStorage.getItem('fu_admin_token');
    if (!token) { router.push('/login'); return; }

    apiFetch<Cabin>(`/admin/room-types/${id}`)
      .then((found) => {
        setCabin(found);
        setName(found.name);
        setDescription(found.description ?? '');
        setCapacityAdults(found.capacityAdults);
        setCapacityChildren(found.capacityChildren);
        setBasePrice(found.basePrice);
        setLowOccupancyPrice(found.lowOccupancyPrice ?? '');
        setLowOccupancyThreshold(
          found.lowOccupancyThreshold != null ? String(found.lowOccupancyThreshold) : '',
        );
        setStatus(found.status);
        setImages([...(found.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder));
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
          ...(lowOccupancyPrice !== '' ? { lowOccupancyPrice: Number(lowOccupancyPrice) } : {}),
          ...(lowOccupancyThreshold !== '' ? { lowOccupancyThreshold: Number(lowOccupancyThreshold) } : {}),
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

  async function handleAddImage() {
    if (!newImageUrl.trim()) return;
    setAddingImage(true);
    setImageError('');
    try {
      const result = await apiFetch<CabinImage>(`/admin/room-types/${id}/images`, {
        method: 'POST',
        body: JSON.stringify({ url: newImageUrl.trim(), altText: newImageAlt.trim() || null }),
      });
      setImages((prev) => [...prev, result]);
      setNewImageUrl('');
      setNewImageAlt('');
    } catch {
      setImageError('Error al agregar imagen');
    } finally {
      setAddingImage(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    setDeletingImageId(imageId);
    setImageError('');
    try {
      await apiFetch(`/admin/room-types/${id}/images/${imageId}`, { method: 'DELETE' });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      setImageError('Error al eliminar imagen');
    } finally {
      setDeletingImageId(null);
    }
  }

  async function handleMoveImage(imageId: string, direction: 'up' | 'down') {
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((img) => img.id === imageId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const newOrder = [...sorted];
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];

    setReordering(true);
    setImageError('');
    try {
      await apiFetch(`/admin/room-types/${id}/images/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ imageIds: newOrder.map((img) => img.id) }),
      });
      setImages(newOrder.map((img, i) => ({ ...img, sortOrder: i })));
    } catch {
      setImageError('Error al reordenar imágenes');
    } finally {
      setReordering(false);
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
          description="La primera imagen es la portada. Agrega URLs de imágenes para mostrarlas en el catálogo público."
        >
          {/* Add image */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              className={`${inputCls} flex-1`}
              placeholder="https://example.com/imagen.jpg"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddImage(); } }}
            />
            <input
              className={`${inputCls} sm:w-44`}
              placeholder="Alt text (opcional)"
              value={newImageAlt}
              onChange={(e) => setNewImageAlt(e.target.value)}
            />
            <button
              type="button"
              disabled={addingImage || !newImageUrl.trim()}
              onClick={handleAddImage}
              className="shrink-0 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {addingImage ? 'Agregando…' : 'Agregar'}
            </button>
          </div>

          {imageError && (
            <p className="mb-3 text-sm font-medium text-red-600">{imageError}</p>
          )}

          {images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img, i) => (
                <div key={img.id} className="group">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
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
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={i === 0 || reordering}
                        onClick={() => handleMoveImage(img.id, 'up')}
                        title="Mover arriba"
                        className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={i === images.length - 1 || reordering}
                        onClick={() => handleMoveImage(img.id, 'down')}
                        title="Mover abajo"
                        className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={deletingImageId === img.id}
                      onClick={() => handleDeleteImage(img.id)}
                      title="Eliminar imagen"
                      className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingImageId === img.id ? '…' : '✕'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
              <p className="text-sm font-medium text-neutral-600">Sin imágenes</p>
              <p className="mt-1 text-xs text-neutral-400">
                Agrega una URL de imagen para que aparezca en el catálogo público.
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
          description="Tarifa base por noche. Configura baja ocupación para cobrar menos con pocos huéspedes."
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
              <p className="mt-1.5 text-[11px] text-neutral-400">
                Se aplica cuando hay más personas que el umbral de baja ocupación.
              </p>
            </div>

            <div />

            <div>
              <label className={labelCls}>Tarifa baja ocupación (MXN / noche)</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  className={`${inputCls} pl-8`}
                  value={lowOccupancyPrice}
                  onChange={(e) => setLowOccupancyPrice(e.target.value)}
                  placeholder="Ej. 1400"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-400">
                Dejar vacío para no usar tarifa diferenciada.
              </p>
            </div>

            <div>
              <label className={labelCls}>Aplica hasta cuántas personas</label>
              <input
                type="number"
                min={1}
                max={20}
                className={inputCls}
                value={lowOccupancyThreshold}
                onChange={(e) => setLowOccupancyThreshold(e.target.value)}
                placeholder="Ej. 2"
              />
              <p className="mt-1.5 text-[11px] text-neutral-400">
                Tarifa baja aplica si total de personas ≤ este número.
              </p>
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
