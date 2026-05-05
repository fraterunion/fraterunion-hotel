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
  lowOccupancyPrice: number | string | null;
  lowOccupancyThreshold: number | null;
  capacityAdults: number;
  capacityChildren: number;
  bedType: string | null;
  sizeM2: number | null;
  images: { url: string; altText: string | null }[];
  amenities: { name: string }[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const WHATSAPP_BOOKING_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOOKING_URL ?? '';

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
                            {firstCabin.lowOccupancyPrice
                              ? `Desde ${formatCurrency(firstCabin.lowOccupancyPrice)}`
                              : formatCurrency(firstCabin.basePrice)}
                          </p>
                          <p className="text-xs text-[var(--cabin-ink-faint)]">
                            {bookingCopy.catalog.perNight}
                          </p>
                          {firstCabin.lowOccupancyPrice != null && firstCabin.lowOccupancyThreshold != null && (
                            <p className="mt-0.5 text-[11px] text-[var(--cabin-ink-faint)]">
                              {formatCurrency(firstCabin.basePrice)} para {firstCabin.lowOccupancyThreshold + 1}–{firstCabin.capacityAdults} personas
                            </p>
                          )}
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
                                {cabin.lowOccupancyPrice
                                  ? `Desde ${formatCurrency(cabin.lowOccupancyPrice)}`
                                  : formatCurrency(cabin.basePrice)}
                              </p>
                              <p className="text-xs text-[var(--cabin-ink-faint)]">
                                {bookingCopy.catalog.perNight}
                              </p>
                              {cabin.lowOccupancyPrice != null && cabin.lowOccupancyThreshold != null && (
                                <p className="mt-0.5 text-[10px] text-[var(--cabin-ink-faint)]">
                                  {formatCurrency(cabin.basePrice)} · {cabin.lowOccupancyThreshold + 1}–{cabin.capacityAdults} p.
                                </p>
                              )}
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

          {/* WhatsApp CTA */}
          {!loading && !error && WHATSAPP_BOOKING_URL && (
            <div className="mt-20 flex flex-col items-center gap-4 border-t border-[var(--cabin-border-soft)] pt-16 text-center">
              <p className="text-sm text-[var(--cabin-ink-faint)]">
                ¿Prefieres reservar por WhatsApp o tienes preguntas?
              </p>
              <a
                href={WHATSAPP_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full bg-[#25D366] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,211,102,0.22)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#1EBC5A] hover:shadow-[0_12px_32px_rgba(37,211,102,0.32)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Reservar por WhatsApp
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
