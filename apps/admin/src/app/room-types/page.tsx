'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type RoomType = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number | string;
  capacityAdults: number;
  capacityChildren: number;
  bedType?: string | null;
  sizeM2?: number | null;
  status: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function RoomTypesPage() {
  const router = useRouter();

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [capacityAdults, setCapacityAdults] = useState('2');
  const [capacityChildren, setCapacityChildren] = useState('0');
  const [bedType, setBedType] = useState('');
  const [sizeM2, setSizeM2] = useState('');

  async function loadRoomTypes() {
    const token = localStorage.getItem('fu_admin_token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/room-types`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load room types');
      }

      const data = await response.json();
      setRoomTypes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load room types');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoomTypes();
  }, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('fu_admin_token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/room-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          slug,
          description,
          basePrice: Number(basePrice),
          capacityAdults: Number(capacityAdults),
          capacityChildren: Number(capacityChildren),
          bedType,
          sizeM2: sizeM2 ? Number(sizeM2) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to create room type');
      }

      setName('');
      setSlug('');
      setDescription('');
      setBasePrice('');
      setCapacityAdults('2');
      setCapacityChildren('0');
      setBedType('');
      setSizeM2('');

      await loadRoomTypes();
    } catch (err: any) {
      setError(err.message || 'Failed to create room type');
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('fu_admin_token');
    localStorage.removeItem('fu_admin_user');
    router.push('/login');
  }

  return (
    <main className="min-h-screen bg-neutral-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              FraterUnion Hotel
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-900">
              Room Types
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Manage the hotel inventory visible for reservations.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Log out
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-900">
              Create room type
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Add a new room category for the hotel.
            </p>

            <form onSubmit={handleCreate} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900"
                  placeholder="Deluxe King"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Slug
                </label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900"
                  placeholder="deluxe-king"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900"
                  placeholder="Spacious room with king bed and seating area."
                  rows={4}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Base price
                </label>
                <input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900"
                  placeholder="3200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Adults
                  </label>
                  <input
                    type="number"
                    value={capacityAdults}
                    onChange={(e) => setCapacityAdults(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Children
                  </label>
                  <input
                    type="number"
                    value={capacityChildren}
                    onChange={(e) => setCapacityChildren(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Bed type
                </label>
                <input
                  value={bedType}
                  onChange={(e) => setBedType(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900"
                  placeholder="King"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Size (m²)
                </label>
                <input
                  type="number"
                  value={sizeM2}
                  onChange={(e) => setSizeM2(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900"
                  placeholder="36"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {submitting ? 'Creating...' : 'Create room type'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-neutral-900">
                Existing room types
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                Inventory currently available in the system.
              </p>
            </div>

            {loading ? (
              <div className="text-sm text-neutral-600">Loading room types...</div>
            ) : roomTypes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-sm text-neutral-500">
                No room types yet.
              </div>
            ) : (
              <div className="grid gap-4">
                {roomTypes.map((roomType) => (
                  <div
                    key={roomType.id}
                    className="rounded-2xl border border-neutral-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900">
                          {roomType.name}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-500">
                          {roomType.slug}
                        </p>
                      </div>

                      <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                        {roomType.status}
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-neutral-600">
                      {roomType.description || 'No description provided.'}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div className="rounded-xl bg-neutral-50 p-3">
                        <p className="text-xs text-neutral-500">Base price</p>
                        <p className="mt-1 text-sm font-semibold text-neutral-900">
                          ${String(roomType.basePrice)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-neutral-50 p-3">
                        <p className="text-xs text-neutral-500">Adults</p>
                        <p className="mt-1 text-sm font-semibold text-neutral-900">
                          {roomType.capacityAdults}
                        </p>
                      </div>

                      <div className="rounded-xl bg-neutral-50 p-3">
                        <p className="text-xs text-neutral-500">Children</p>
                        <p className="mt-1 text-sm font-semibold text-neutral-900">
                          {roomType.capacityChildren}
                        </p>
                      </div>

                      <div className="rounded-xl bg-neutral-50 p-3">
                        <p className="text-xs text-neutral-500">Bed type</p>
                        <p className="mt-1 text-sm font-semibold text-neutral-900">
                          {roomType.bedType || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-neutral-500">
                      Size: {roomType.sizeM2 || '—'} m²
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}