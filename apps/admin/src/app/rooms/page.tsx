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
};

type Room = {
  id: string;
  roomTypeId: string;
  roomNumber: string;
  floor?: string | null;
  status: string;
  notes?: string | null;
  roomType: RoomType;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const initialForm = {
  roomTypeId: '',
  roomNumber: '',
  floor: '',
  notes: '',
};

export default function RoomsPage() {
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [roomTypeId, setRoomTypeId] = useState(initialForm.roomTypeId);
  const [roomNumber, setRoomNumber] = useState(initialForm.roomNumber);
  const [floor, setFloor] = useState(initialForm.floor);
  const [notes, setNotes] = useState(initialForm.notes);

  function resetForm() {
    setEditingId(null);
    setRoomTypeId(initialForm.roomTypeId);
    setRoomNumber(initialForm.roomNumber);
    setFloor(initialForm.floor);
    setNotes(initialForm.notes);
  }

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
      const [roomsRes, roomTypesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/rooms`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/admin/room-types`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (roomsRes.status === 401 || roomTypesRes.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      if (!roomsRes.ok) throw new Error('Failed to load rooms');
      if (!roomTypesRes.ok) throw new Error('Failed to load room types');

      const roomsData = await roomsRes.json();
      const roomTypesData = await roomTypesRes.json();

      setRooms(roomsData);
      setRoomTypes(roomTypesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function startEdit(room: Room) {
    setEditingId(room.id);
    setRoomTypeId(room.roomTypeId);
    setRoomNumber(room.roomNumber);
    setFloor(room.floor || '');
    setNotes(room.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('fu_admin_token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const url = editingId
        ? `${API_BASE_URL}/admin/rooms/${editingId}`
        : `${API_BASE_URL}/admin/rooms`;

      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomTypeId,
          roomNumber,
          floor,
          notes,
        }),
      });

      if (response.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message || 'Request failed',
        );
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save room');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Are you sure you want to delete this room?');
    if (!confirmed) return;

    const token = localStorage.getItem('fu_admin_token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setDeletingId(id);
      setError('');

      const response = await fetch(`${API_BASE_URL}/admin/rooms/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to delete room');
      }

      if (editingId === id) resetForm();

      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete room');
    } finally {
      setDeletingId(null);
    }
  }

  const stats = {
    total: rooms.length,
    available: rooms.filter((room) => room.status === 'AVAILABLE').length,
    occupied: rooms.filter((room) => room.status === 'OCCUPIED').length,
    outOfService: rooms.filter((room) => room.status === 'OUT_OF_SERVICE').length,
  };

  return (
    <AdminShell
      title="Rooms"
      subtitle="Manage physical hotel inventory, room mapping, and the operational room list."
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total rooms" value={stats.total} />
        <StatCard label="Available" value={stats.available} />
        <StatCard label="Occupied" value={stats.occupied} />
        <StatCard label="Out of service" value={stats.outOfService} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <SectionCard
          title={editingId ? 'Edit room' : 'Create room'}
          subtitle={
            editingId
              ? 'Update the selected physical room.'
              : 'Add a new physical room to the hotel inventory.'
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                Room type
              </label>
              <select
                value={roomTypeId}
                onChange={(e) => setRoomTypeId(e.target.value)}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                required
              >
                <option value="">Select a room type</option>
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                Room number
              </label>
              <input
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                placeholder="401"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                Floor
              </label>
              <input
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                placeholder="4"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                placeholder="Ocean-facing premium room"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
              >
                {submitting
                  ? editingId
                    ? 'Saving...'
                    : 'Creating...'
                  : editingId
                    ? 'Save changes'
                    : 'Create room'}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Room inventory"
          subtitle="Physical rooms currently configured in the system."
        >
          {loading ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-sm text-neutral-500">
              Loading rooms...
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-sm text-neutral-500">
              No rooms yet.
            </div>
          ) : (
            <div className="space-y-4">
              {rooms.map((room) => (
                <article
                  key={room.id}
                  className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-5 transition hover:bg-neutral-50"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-neutral-900">
                        Room {room.roomNumber}
                      </h3>
                      <p className="mt-1 text-sm text-neutral-500">
                        {room.roomType?.name || 'Unknown room type'}
                      </p>
                    </div>

                    <StatusBadge
                      value={room.status}
                      tone={
                        room.status === 'AVAILABLE'
                          ? 'success'
                          : room.status === 'OCCUPIED'
                            ? 'warning'
                            : 'danger'
                      }
                    />
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Room type
                      </p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">
                        {room.roomType?.name || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Slug
                      </p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">
                        {room.roomType?.slug || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Floor
                      </p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">
                        {room.floor || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Notes
                      </p>
                      <p className="mt-2 text-sm font-semibold text-neutral-900">
                        {room.notes || 'No notes'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(room)}
                      className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(room.id)}
                      disabled={deletingId === room.id}
                      className="rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingId === room.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AdminShell>
  );
}