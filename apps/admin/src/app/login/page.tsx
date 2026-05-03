'use client';

import { hotelConfig } from '@fraterunion/config';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@casafrater.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Login failed');
      }

      localStorage.setItem('fu_admin_token', data.accessToken);
      localStorage.setItem('fu_admin_user', JSON.stringify(data.user));

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
              {hotelConfig.hotelShortName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
              Acceso al panel
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Introduce tus credenciales para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
                placeholder="admin@ejemplo.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-neutral-900 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? 'Verificando…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          {hotelConfig.hotelName} · Panel de operaciones
        </p>
      </div>
    </main>
  );
}
