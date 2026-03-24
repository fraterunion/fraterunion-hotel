'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  hotelId: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem('fu_admin_token');

      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Unauthorized');
        }

        const data = await response.json();
        setUser(data.user);
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

  function handleLogout() {
    localStorage.removeItem('fu_admin_token');
    localStorage.removeItem('fu_admin_user');
    router.push('/login');
  }

  if (loading) {
    return <main className="min-h-screen bg-neutral-100 p-8">Loading...</main>;
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-neutral-100 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              FraterUnion Hotel
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-900">
              Welcome, {user.firstName}
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900"
          >
            Log out
          </button>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Signed in as</p>
          <p className="mt-2 text-lg font-semibold text-neutral-900">
            {user.firstName} {user.lastName}
          </p>
          <p className="mt-1 text-sm text-neutral-600">{user.email}</p>
          <p className="mt-1 text-sm text-neutral-600">{user.role}</p>
        </div>
      </div>
    </main>
  );
}