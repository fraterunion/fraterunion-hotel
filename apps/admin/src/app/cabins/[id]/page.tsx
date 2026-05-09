'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<
    { id: string; name: string; status: 'uploading' | 'done' | 'error'; errorMsg?: string }[]
  >([]);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleImport() {
    setImporting(true);
    setImportMessage('');
    try {
      const result = await apiFetch<{ imported: number; images: CabinImage[] }>(
        `/admin/room-types/${id}/images/import-static`,
        { method: 'POST' },
      );
      setImages(result.images);
      setImportMessage(
        result.imported > 0
          ? `${result.imported} imagen${result.imported === 1 ? '' : 'es'} importada${result.imported === 1 ? '' : 's'}.`
          : 'No se encontraron imágenes nuevas para importar.',
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      setImportMessage(
        raw.includes('WEB_APP_URL')
          ? 'URL del sitio web no configurada.'
          : 'Error al importar imágenes.',
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    const newItems = fileArray.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      status: 'uploading' as const,
    }));
    setUploadQueue((prev) => [...prev, ...newItems]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const queueId = newItems[i].id;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await apiFetch<CabinImage>(
          `/admin/room-types/${id}/images/upload`,
          { method: 'POST', body: formData },
        );
        setImages((prev) => [...prev, result]);
        setUploadQueue((prev) =>
          prev.map((u) => (u.id === queueId ? { ...u, status: 'done' as const } : u)),
        );
      } catch (err) {
        const raw = err instanceof Error ? err.message : '';
        const errorMsg = raw.includes('not configured')
          ? 'La carga de imágenes aún no está configurada.'
          : 'Error al subir imagen';
        setUploadQueue((prev) =>
          prev.map((u) =>
            u.id === queueId ? { ...u, status: 'error' as const, errorMsg } : u,
          ),
        );
      }
    }

    setTimeout(() => {
      setUploadQueue((prev) => prev.filter((u) => u.status !== 'done'));
    }, 2500);
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
          description="La primera imagen es la portada. Arrastra o selecciona fotos para subirlas."
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={[
              'mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition',
              isDragOver
                ? 'border-neutral-700 bg-neutral-100'
                : 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100',
            ].join(' ')}
          >
            <svg
              className="h-8 w-8 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm font-medium text-neutral-700">
              {isDragOver ? 'Suelta las imágenes aquí' : 'Arrastra imágenes o haz clic para seleccionar'}
            </p>
            <p className="text-xs text-neutral-400">JPG, PNG, WEBP · máx. 8 MB por imagen</p>
          </div>

          {/* Upload queue */}
          {uploadQueue.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className={[
                    'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm',
                    item.status === 'uploading' && 'bg-neutral-100 text-neutral-600',
                    item.status === 'done' && 'bg-emerald-50 text-emerald-700',
                    item.status === 'error' && 'bg-red-50 text-red-700',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {item.status === 'uploading' && (
                    <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                  )}
                  {item.status === 'done' && <span className="shrink-0">✓</span>}
                  {item.status === 'error' && <span className="shrink-0">✕</span>}
                  <span className="truncate">{item.name}</span>
                  {item.status === 'uploading' && (
                    <span className="ml-auto shrink-0 text-xs">Subiendo…</span>
                  )}
                  {item.status === 'error' && (
                    <span className="ml-auto shrink-0 text-xs">
                      {item.errorMsg ?? 'Error al subir'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Active images grid */}
          {images.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                  {img.altText && (
                    <p className="mt-1 truncate px-0.5 text-[11px] text-neutral-400">
                      {img.altText}
                    </p>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-1">
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
          ) : uploadQueue.length === 0 ? (
            <div className="mb-4 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-8 text-center">
              <p className="text-sm text-neutral-500">Sin imágenes. Sube la primera foto arriba.</p>
              <button
                type="button"
                disabled={importing}
                onClick={handleImport}
                className="mt-3 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                {importing ? 'Importando…' : 'Importar imágenes actuales del website'}
              </button>
              {importMessage && (
                <p className="mt-2 text-xs text-neutral-500">{importMessage}</p>
              )}
            </div>
          ) : null}

          {/* URL fallback — collapsible */}
          <div className="border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={() => setShowUrlInput((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition hover:text-neutral-700"
            >
              <span>{showUrlInput ? '▾' : '▸'}</span>
              Agregar por URL
            </button>
            {showUrlInput && (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="url"
                  className={`${inputCls} flex-1`}
                  placeholder="https://example.com/imagen.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddImage(); }
                  }}
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
            )}
            {imageError && (
              <p className="mt-2 text-sm font-medium text-red-600">{imageError}</p>
            )}
          </div>
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
