'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { hotelConfig, hotelLocationLine } from '@fraterunion/config';
import { bookingCopy } from '../../content/booking-es';

type CabinType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number | string;
  capacityAdults: number;
  capacityChildren: number;
  bedType: string | null;
  sizeM2: number | null;
  images: { url: string; altText: string | null }[];
  amenities: { name: string }[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const CABIN_FALLBACK: Record<string, string> = {
  'casa-grande': '/images/los-vagones-hero.jpg',
  girasoles: '/images/los-vagones-hero.jpg',
  alcatraces: '/images/los-vagones-hero.jpg',
  'cabana-del-aguila': '/images/los-vagones-hero.jpg',
  'vagon-el-colorado': '/images/los-vagones-hero.jpg',
  'cabana-del-pozo': '/images/los-vagones-hero.jpg',
};

function cabinImage(slug: string, images: { url: string }[]): string {
  return images[0]?.url ?? CABIN_FALLBACK[slug] ?? '/images/los-vagones-hero.jpg';
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function BookingCatalogPage() {
  const [cabins, setCabins] = useState<CabinType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/public/catalog/${hotelConfig.defaultHotelSlug}`,
        );
        if (!res.ok) throw new Error();
        const data: CabinType[] = await res.json();
        setCabins(data);
      } catch {
        setError(bookingCopy.catalog.error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="relative bg-[var(--lv-dark)]">
      {/* Minimal top nav */}
      <nav className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-7 sm:px-10 lg:px-16">
        <Link
          href="/"
          className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--lv-cream)]/70 transition-colors hover:text-[var(--lv-cream)]"
        >
          {hotelConfig.hotelShortName}
        </Link>
      </nav>

      {/* Editorial hero header */}
      <header className="relative flex min-h-[54vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/los-vagones-hero.jpg)' }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--lv-dark)]/95 via-[var(--lv-dark)]/50 to-[var(--lv-dark)]/18"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[var(--lv-dark)]/35 via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 sm:px-10 sm:pb-20 lg:px-16 lg:pb-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[var(--cabin-terra)]">
            {bookingCopy.catalog.eyebrow} · {hotelLocationLine()}
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-light leading-[1.06] tracking-tight text-[var(--lv-cream)] sm:text-6xl lg:text-7xl">
            {bookingCopy.catalog.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--lv-cream)]/60 sm:text-lg">
            {bookingCopy.catalog.subheadline}
          </p>
        </div>
      </header>

      {/* Catalog grid */}
      <section className="bg-[var(--cabin-bg)] px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <p className="py-24 text-center text-sm text-[var(--cabin-ink-faint)]">
              {bookingCopy.catalog.loading}
            </p>
          ) : error ? (
            <p className="py-24 text-center text-sm font-medium text-red-700">
              {error}
            </p>
          ) : (
            <div className="grid gap-10 sm:grid-cols-2 lg:gap-12">
              {cabins.map((cabin) => (
                <Link
                  key={cabin.id}
                  href={`/booking/${cabin.slug}`}
                  className="group block overflow-hidden rounded-2xl bg-[var(--cabin-elevated)] shadow-[0_8px_32px_rgba(28,24,19,0.09)] ring-1 ring-[var(--cabin-border-soft)] transition-shadow duration-300 hover:shadow-[0_20px_56px_rgba(28,24,19,0.13)]"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--cabin-bg-deep)]">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition duration-700 ease-out group-hover:scale-[1.04]"
                      style={{
                        backgroundImage: `url(${cabinImage(cabin.slug, cabin.images)})`,
                      }}
                      aria-hidden
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-[var(--lv-dark)]/40 via-transparent to-transparent"
                      aria-hidden
                    />
                  </div>

                  {/* Content */}
                  <div className="p-7 sm:p-8">
                    <div className="flex items-start justify-between gap-6">
                      <h2 className="text-2xl font-light tracking-tight text-[var(--cabin-forest-deep)] sm:text-[1.7rem]">
                        {cabin.name}
                      </h2>
                      <div className="shrink-0 text-right">
                        <p className="text-xl font-semibold tabular-nums text-[var(--cabin-ink)]">
                          {formatCurrency(cabin.basePrice)}
                        </p>
                        <p className="text-xs text-[var(--cabin-ink-faint)]">
                          {bookingCopy.catalog.perNight}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-[var(--cabin-ink-soft)]">
                      {cabin.description ?? ''}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[var(--cabin-olive-soft)] px-3 py-1 text-xs font-medium text-[var(--cabin-ink)] ring-1 ring-[var(--cabin-border)]">
                        {bookingCopy.catalog.capacityLabel(cabin.capacityAdults)}
                      </span>
                      {cabin.bedType ? (
                        <span className="rounded-full bg-[var(--cabin-olive-soft)] px-3 py-1 text-xs font-medium text-[var(--cabin-ink)] ring-1 ring-[var(--cabin-border)]">
                          {cabin.bedType}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-7 flex items-center gap-2 text-sm font-semibold text-[var(--cabin-forest-deep)] transition-colors duration-200 group-hover:text-[var(--cabin-terra)]">
                      {bookingCopy.catalog.viewCabin}
                      <span className="transition-transform duration-200 group-hover:translate-x-1">
                        →
                      </span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
