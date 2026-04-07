'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../components/admin/AdminShell';

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

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

  const primaryKpis = [
    {
      label: 'Total reservations',
      value: metrics.totalReservations.toLocaleString(),
      trend: 'Live booking count',
    },
    {
      label: 'Pending',
      value: metrics.pendingReservations.toLocaleString(),
      trend: 'Awaiting confirmation',
    },
    {
      label: 'Confirmed',
      value: metrics.confirmedReservations.toLocaleString(),
      trend: 'Ready to arrive',
    },
    {
      label: 'Checked in',
      value: metrics.checkedInReservations.toLocaleString(),
      trend: 'Currently staying',
    },
    {
      label: 'Revenue booked',
      value: formatCurrency(metrics.totalRevenueBooked),
      trend: 'Gross reservations value',
    },
    {
      label: 'Revenue paid',
      value: formatCurrency(metrics.totalRevenuePaid),
      trend: 'Captured payments',
    },
  ];

  const secondaryKpis = [
    {
      label: 'Checked out',
      value: metrics.checkedOutReservations.toLocaleString(),
      trend: 'Completed stays',
    },
    {
      label: 'Cancelled',
      value: metrics.cancelledReservations.toLocaleString(),
      trend: 'Dropped bookings',
    },
    {
      label: 'Revenue pending',
      value: formatCurrency(metrics.totalRevenuePending),
      trend: 'Outstanding payments',
    },
  ];

  return (
    <AdminShell
      title="Hotel Dashboard"
      subtitle="Live operational overview"
    >
      <section className="mb-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Hotel Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-500">
          Live operational overview
        </p>
        <p className="mt-5 text-sm text-neutral-600">
          Welcome back, {user.firstName}. Here is the latest reservation and revenue activity.
        </p>
      </section>

      <section className="mb-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {primaryKpis.map((kpi) => (
            <article
              key={kpi.label}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              <p className="text-sm font-medium text-neutral-500">{kpi.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">{kpi.value}</p>
              <p className="mt-2 text-xs text-neutral-500">{kpi.trend}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {secondaryKpis.map((kpi) => (
            <article
              key={kpi.label}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              <p className="text-sm font-medium text-neutral-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">{kpi.value}</p>
              <p className="mt-2 text-xs text-neutral-500">{kpi.trend}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <article className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Occupancy Trend</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Daily occupancy visualization will be displayed here.
              </p>
            </div>
          </div>
          <div className="mt-6 h-64 rounded-2xl bg-neutral-100" />
        </article>

        <article className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Revenue Breakdown</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Revenue composition chart placeholder.
              </p>
            </div>
          </div>
          <div className="mt-6 h-64 rounded-2xl bg-neutral-100" />
        </article>
      </section>

    </AdminShell>
  );
}