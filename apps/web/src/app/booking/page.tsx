'use client';

import { useEffect, useRef, useState } from 'react';
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

function cabinHeroImage(slug: string, images: { url: string }[]): string {
  if (images.length > 0) return images[0].url;
  return `/images/cabins/${slug}/hero.jpg`;
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function RevealCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.07 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: 'opacity 700ms ease-out, transform 700ms ease-out',
      }}
    >
      {children}
    </div>
  );
}

export default function BookingCatalogPage() {
  const [cabins, setCabins] = useState<CabinType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 80);
    return () => clearTimeout(t);
  }, []);

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

  const [firstCabin, ...restCabins] = cabins;

  return (
    <main className="bg-[var(--lv-dark)]">
      {/* Minimal top nav */}
      <nav className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-7 sm:px-10 lg:px-16">
        <Link
          href="/"
          className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--lv-cream)]/70 transition-colors hover:text-[var(--lv-cream)]"
        >
          {hotelConfig.hotelShortName}
        </Link>
      </nav>

      {/* Cinematic hero — 72vh with slow scale-in */}
      <header className="relative flex min-h-[72vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/los-vagones-hero.jpg)',
            transform: heroReady ? 'scale(1)' : 'scale(1.07)',
            transition: 'transform 1.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--lv-dark)] via-[var(--lv-dark)]/50 to-[var(--lv-dark)]/10"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[var(--lv-dark)]/40 via-transparent to-transparent"
          aria-hidden
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 sm:px-10 sm:pb-24 lg:px-16 lg:pb-28">
          <div
            style={{
              opacity: heroReady ? 1 : 0,
              transform: heroReady ? 'translateY(0)' : 'translateY(18px)',
              transition:
                'opacity 900ms ease-out 300ms, transform 900ms ease-out 300ms',
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-[var(--cabin-terra)]">
              {bookingCopy.catalog.eyebrow} · {hotelLocationLine()}
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-light leading-[1.04] tracking-tight text-[var(--lv-cream)] sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
              {bookingCopy.catalog.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--lv-cream)]/55 sm:text-lg">
              {bookingCopy.catalog.subheadline}
            </p>
          </div>
        </div>
      </header>

      {/* Cabin catalog */}
      <section className="bg-[var(--cabin-bg)] px-6 py-20 sm:px-10 sm:py-24 lg:px-16 lg:py-28">
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
            <div className="space-y-8 lg:space-y-10">
              {/* First cabin — editorial full-width card */}
              {firstCabin && (
                <RevealCard>
                  <Link
                    href={`/booking/${firstCabin.slug}`}
                    className="group flex flex-col overflow-hidden rounded-3xl bg-[var(--cabin-elevated)] shadow-[0_8px_48px_rgba(28,24,19,0.09)] transition-shadow duration-500 hover:shadow-[0_28px_80px_rgba(28,24,19,0.15)] lg:min-h-[500px] lg:flex-row"
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:w-[60%] lg:shrink-0">
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out group-hover:scale-[1.05] group-hover:brightness-105"
                        style={{
                          backgroundImage: `url(${cabinHeroImage(firstCabin.slug, firstCabin.images)})`,
                        }}
                        aria-hidden
                      />
                    </div>
                    {/* Content */}
                    <div className="flex flex-col justify-center px-8 py-10 lg:px-14 lg:py-16">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--cabin-terra)]">
                        {bookingCopy.catalog.eyebrow}
                      </p>
                      <h2 className="mt-4 text-3xl font-light tracking-tight text-[var(--cabin-forest-deep)] sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
                        {firstCabin.name}
                      </h2>
                      <p className="mt-5 line-clamp-4 text-sm leading-relaxed text-[var(--cabin-ink-soft)] sm:text-base sm:leading-[1.8]">
                        {firstCabin.description ?? ''}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[var(--cabin-olive-soft)] px-3.5 py-1.5 text-[11px] font-medium text-[var(--cabin-ink)]">
                          {bookingCopy.catalog.capacityLabel(
                            firstCabin.capacityAdults,
                          )}
                        </span>
                        {firstCabin.bedType && (
                          <span className="rounded-full bg-[var(--cabin-olive-soft)] px-3.5 py-1.5 text-[11px] font-medium text-[var(--cabin-ink)]">
                            {firstCabin.bedType}
                          </span>
                        )}
                      </div>
                      <div className="mt-10 flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-semibold tabular-nums text-[var(--cabin-ink)]">
                            {formatCurrency(firstCabin.basePrice)}
                          </p>
                          <p className="text-xs text-[var(--cabin-ink-faint)]">
                            {bookingCopy.catalog.perNight}
                          </p>
                        </div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--cabin-forest-deep)] transition-colors duration-200 group-hover:text-[var(--cabin-terra)]">
                          {bookingCopy.catalog.viewCabin}
                          <span className="transition-transform duration-300 group-hover:translate-x-1.5">
                            →
                          </span>
                        </p>
                      </div>
                    </div>
                  </Link>
                </RevealCard>
              )}

              {/* Remaining cabins — 2-column grid */}
              {restCabins.length > 0 && (
                <div className="grid gap-8 sm:grid-cols-2 lg:gap-10">
                  {restCabins.map((cabin, i) => (
                    <RevealCard key={cabin.id} delay={i % 2 === 1 ? 110 : 0}>
                      <Link
                        href={`/booking/${cabin.slug}`}
                        className="group block overflow-hidden rounded-3xl bg-[var(--cabin-elevated)] shadow-[0_8px_32px_rgba(28,24,19,0.07)] transition-shadow duration-500 hover:shadow-[0_24px_64px_rgba(28,24,19,0.13)]"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <div
                            className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out group-hover:scale-[1.05] group-hover:brightness-105"
                            style={{
                              backgroundImage: `url(${cabinHeroImage(cabin.slug, cabin.images)})`,
                            }}
                            aria-hidden
                          />
                          <div
                            className="absolute inset-0 bg-gradient-to-t from-[var(--lv-dark)]/28 via-transparent to-transparent"
                            aria-hidden
                          />
                        </div>

                        <div className="p-7 sm:p-8">
                          <div className="flex items-start justify-between gap-4">
                            <h2 className="text-2xl font-light tracking-tight text-[var(--cabin-forest-deep)]">
                              {cabin.name}
                            </h2>
                            <div className="shrink-0 text-right">
                              <p className="text-lg font-semibold tabular-nums text-[var(--cabin-ink)]">
                                {formatCurrency(cabin.basePrice)}
                              </p>
                              <p className="text-xs text-[var(--cabin-ink-faint)]">
                                {bookingCopy.catalog.perNight}
                              </p>
                            </div>
                          </div>

                          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--cabin-ink-soft)]">
                            {cabin.description ?? ''}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-full bg-[var(--cabin-olive-soft)] px-3 py-1 text-[11px] font-medium text-[var(--cabin-ink)]">
                              {bookingCopy.catalog.capacityLabel(
                                cabin.capacityAdults,
                              )}
                            </span>
                            {cabin.bedType && (
                              <span className="rounded-full bg-[var(--cabin-olive-soft)] px-3 py-1 text-[11px] font-medium text-[var(--cabin-ink)]">
                                {cabin.bedType}
                              </span>
                            )}
                          </div>

                          <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--cabin-forest-deep)] transition-colors duration-200 group-hover:text-[var(--cabin-terra)]">
                            {bookingCopy.catalog.viewCabin}
                            <span className="transition-transform duration-300 group-hover:translate-x-1.5">
                              →
                            </span>
                          </p>
                        </div>
                      </Link>
                    </RevealCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
