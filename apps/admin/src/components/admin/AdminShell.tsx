'use client';

import { hotelConfig } from '@fraterunion/config';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Reservations', href: '/reservations' },
  { label: 'Cabins', href: '/cabins' },
  { label: 'Calendar', href: '/calendar' },
];

export default function AdminShell({ title, subtitle, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    localStorage.removeItem('fu_admin_token');
    localStorage.removeItem('fu_admin_user');
    router.push('/login');
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto flex min-h-screen max-w-[1400px] gap-6 px-6 py-6">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-6 space-y-2">
            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                {hotelConfig.hotelShortName}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900">
                Admin
              </h2>
              <p className="mt-0.5 text-xs text-neutral-400">
                {hotelConfig.adminShellTagline}
              </p>
            </div>

            <nav className="rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={[
                    'flex w-full items-center rounded-2xl px-4 py-2.5 text-left text-sm font-medium transition',
                    isActive(item.href)
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center rounded-2xl px-4 py-2.5 text-left text-sm font-medium text-neutral-500 transition hover:bg-red-50 hover:text-red-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 flex-1">
          {/* Topbar */}
          <div className="mb-6 rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-sm ring-1 ring-black/[0.03]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                  {hotelConfig.hotelName}
                </p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {/* Mobile nav */}
              <div className="flex flex-wrap gap-2 lg:hidden">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={[
                      'rounded-xl px-3 py-2 text-xs font-medium transition',
                      isActive(item.href)
                        ? 'bg-neutral-900 text-white'
                        : 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-500 transition hover:text-red-600"
                >
                  Salir
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
