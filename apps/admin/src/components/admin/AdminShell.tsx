'use client';

import { hotelConfig } from '@fraterunion/config';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function AdminShell({ title, subtitle, children }: Props) {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem('fu_admin_token');
    localStorage.removeItem('fu_admin_user');
    router.push('/login');
  }

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Reservations', href: '/reservations' },
    { label: 'Rooms', href: '/rooms' },
    { label: 'Room Types', href: '/room-types' },
  ];

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-6 py-6">
        <aside className="hidden w-64 shrink-0 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:block">
          <div className="border-b border-neutral-200 pb-5">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
              {hotelConfig.hotelShortName}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-neutral-900">Admin</h2>
            <p className="mt-2 text-sm text-neutral-500">{hotelConfig.adminShellTagline}</p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 border-t border-neutral-200 pt-5">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
            >
              Log out
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-5 rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-sm ring-1 ring-black/[0.03]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-400">
                  {hotelConfig.hotelName}
                </p>
                <h1 className="mt-1 text-4xl font-semibold tracking-tight text-neutral-900">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1 max-w-2xl text-xs font-normal leading-snug text-neutral-500">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 lg:hidden">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}