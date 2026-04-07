'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../components/admin/AdminShell';
import SectionCard from '../../components/admin/SectionCard';
import StatusBadge from '../../components/admin/StatusBadge';
import StatCard from '../../components/admin/StatCard';

type RoomType = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  basePrice: string;
  capacityAdults: number;
  capacityChildren: number;
  bedType?: string | null;
  sizeM2?: number | null;
  status: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function RoomTypesPage() {
  const router = useRouter();

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    basePrice: '',
    capacityAdults: 1,
    capacityChildren: 0,
    bedType: '',
    sizeM2: '',
  });

  function clearAuthAndRedirect() {
    localStorage.removeItem('fu_admin_token');
    localStorage.removeItem('fu_admin_user');
    router.push('/login');
  }

  async function loadData() {
    const token = localStorage.getItem('fu_admin_token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/room-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      if (!res.ok) throw new Error('Failed to load room types');

      const data = await res.json();
      setRoomTypes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      basePrice: '',
      capacityAdults: 1,
      capacityChildren: 0,
      bedType: '',
      sizeM2: '',
    });
  }

  function startEdit(rt: RoomType) {
    setEditingId(rt.id);
    setForm({
      name: rt.name,
      slug: rt.slug,
      description: rt.description || '',
      basePrice: rt.basePrice,
      capacityAdults: rt.capacityAdults,
      capacityChildren: rt.capacityChildren,
      bedType: rt.bedType || '',
      sizeM2: rt.sizeM2?.toString() || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('fu_admin_token');

    try {
      const url = editingId
        ? `${API_BASE_URL}/admin/room-types/${editingId}`
        : `${API_BASE_URL}/admin/room-types`;

      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          basePrice: Number(form.basePrice),
          sizeM2: form.sizeM2 ? Number(form.sizeM2) : null,
        }),
      });

      if (res.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.message || 'Error');

      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const stats = {
    total: roomTypes.length,
    active: roomTypes.filter((r) => r.status === 'ACTIVE').length,
  };

  return (
    <AdminShell
      title="Room Types"
      subtitle="Define room categories, pricing, capacity, and configuration."
    >
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        <StatCard label="Total types" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <SectionCard
          title={editingId ? 'Edit room type' : 'Create room type'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              className="w-full rounded-2xl border px-4 py-3"
              required
            />

            <input
              placeholder="Slug"
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: e.target.value })
              }
              className="w-full rounded-2xl border px-4 py-3"
              required
            />

            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full rounded-2xl border px-4 py-3"
            />

            <input
              placeholder="Base price"
              value={form.basePrice}
              onChange={(e) =>
                setForm({ ...form, basePrice: e.target.value })
              }
              className="w-full rounded-2xl border px-4 py-3"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Adults"
                value={form.capacityAdults}
                onChange={(e) =>
                  setForm({ ...form, capacityAdults: Number(e.target.value) })
                }
                className="rounded-2xl border px-4 py-3"
              />

              <input
                placeholder="Children"
                value={form.capacityChildren}
                onChange={(e) =>
                  setForm({ ...form, capacityChildren: Number(e.target.value) })
                }
                className="rounded-2xl border px-4 py-3"
              />
            </div>

            <input
              placeholder="Bed type"
              value={form.bedType}
              onChange={(e) =>
                setForm({ ...form, bedType: e.target.value })
              }
              className="w-full rounded-2xl border px-4 py-3"
            />

            <input
              placeholder="Size (m²)"
              value={form.sizeM2}
              onChange={(e) =>
                setForm({ ...form, sizeM2: e.target.value })
              }
              className="w-full rounded-2xl border px-4 py-3"
            />

            <button className="w-full rounded-2xl bg-black text-white py-3">
              {submitting
                ? 'Saving...'
                : editingId
                ? 'Save changes'
                : 'Create'}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Existing room types">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-4">
              {roomTypes.map((rt) => (
                <div
                  key={rt.id}
                  className="rounded-3xl border p-5 bg-neutral-50"
                >
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{rt.name}</h3>
                      <p className="text-sm text-neutral-500">{rt.slug}</p>
                    </div>

                    <StatusBadge value={rt.status} tone="success" />
                  </div>

                  <p className="mt-3 text-sm">{rt.description}</p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => startEdit(rt)}
                      className="border px-3 py-2 rounded-xl"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AdminShell>
  );
}