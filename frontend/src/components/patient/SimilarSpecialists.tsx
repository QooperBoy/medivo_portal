'use client';

/**
 * SimilarSpecialists — sekcja „podobni specjaliści" (A8) pod profilem specjalisty.
 *
 * Pobiera listę specjalistów o tej samej specjalizacji (`GET /api/specialists`),
 * odfiltrowuje bieżący profil (po slugu) i prezentuje do 4 kompaktowych kart —
 * skrót do innego profilu, gdy u obecnego brak wolnych terminów. Sekcja jest
 * pomocnicza: w stanie pustym / błędu nie renderuje nic (nie zaśmieca profilu).
 */

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { SpecialistSearchItem, SpecialistsListResponse } from '@/domain';
import { Avatar, RatingStars } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { Sparkle } from '@/components/doodles';
import { cn } from '@/lib/utils';

export interface SimilarSpecialistsProps {
  /** Specjalizacja, po której dobieramy podobnych (z profilu bieżącego). */
  specialization: string;
  /** Slug bieżącego specjalisty — wykluczany z wyników. */
  excludeSlug: string;
  /** Miasto bieżącego profilu — podnosi w kolejności specjalistów z tego miasta. */
  city?: string;
}

/** Maksymalna liczba prezentowanych kart. */
const MAX_ITEMS = 4;

type Status = 'loading' | 'ready';

function capitalizeFirst(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Etykieta liczby wolnych terminów z polską odmianą rzeczownika „termin". */
function freeSlotsLabel(count: number): string {
  if (count === 0) return 'Brak wolnych terminów';
  if (count === 1) return '1 wolny termin';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} wolne terminy`;
  }
  return `${count} wolnych terminów`;
}

/** Pojedyncza kompaktowa karta — cała jest linkiem do profilu specjalisty. */
function SimilarCard({ item }: { item: SpecialistSearchItem }) {
  const {
    slug,
    firstName,
    lastName,
    title,
    photoUrl,
    ratingAvg,
    ratingCount,
    priceFromPln,
    addresses,
    previewSlots,
  } = item;

  const fullName = `${firstName} ${lastName}`;
  const cityText = addresses[0]?.city;
  const freeCount = previewSlots.length;

  return (
    <Link
      href={`/profil/${slug}`}
      className={cn(
        'flex h-full items-start gap-3 rounded-xl2 border border-slate-200/70 bg-white p-4 shadow-card transition-shadow',
        'hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
      )}
    >
      <Avatar src={photoUrl} alt={fullName} size={56} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-sm font-semibold text-ink">{fullName}</h3>
        <p className="truncate text-xs text-ink-muted">{capitalizeFirst(title)}</p>
        <RatingStars value={ratingAvg} count={ratingCount} size="sm" />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-ink-muted">
          <span className="font-semibold text-ink">od {priceFromPln} zł</span>
          {cityText && (
            <span className="inline-flex items-center gap-1">
              <Sparkle className="h-3 w-3 text-brand-400" />
              {cityText}
            </span>
          )}
        </div>
        <span
          className={cn(
            'mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
            freeCount > 0 ? 'bg-brand-50 text-brand-800' : 'bg-surface-subtle text-ink-muted',
          )}
        >
          {freeSlotsLabel(freeCount)}
        </span>
      </div>
    </Link>
  );
}

/** Szkielet ładowania (kilka kompaktowych placeholderów). */
function SimilarSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl2 border border-slate-200/70 bg-surface-subtle"
        />
      ))}
    </div>
  );
}

export function SimilarSpecialists({
  specialization,
  excludeSlug,
  city,
}: SimilarSpecialistsProps) {
  const headingId = useId();
  const [status, setStatus] = useState<Status>(() =>
    specialization ? 'loading' : 'ready',
  );
  const [items, setItems] = useState<SpecialistSearchItem[]>([]);

  useEffect(() => {
    if (!specialization) {
      setItems([]);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    apiClient
      .get<SpecialistsListResponse>(
        `/api/specialists?specialization=${encodeURIComponent(specialization)}`,
      )
      .then((res) => {
        if (cancelled) return;
        if (res.status !== 200) {
          setItems([]);
          setStatus('ready');
          return;
        }
        setItems(res.data.items.filter((item) => item.slug !== excludeSlug));
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [specialization, excludeSlug]);

  // Preferuj specjalistów z tego samego miasta (stabilnie), potem obetnij do MAX.
  const visible = useMemo(() => {
    if (!city) return items.slice(0, MAX_ITEMS);
    const ranked = [...items].sort((a, b) => {
      const aSameCity = a.addresses[0]?.city === city ? 0 : 1;
      const bSameCity = b.addresses[0]?.city === city ? 0 : 1;
      return aSameCity - bSameCity;
    });
    return ranked.slice(0, MAX_ITEMS);
  }, [items, city]);

  if (status === 'loading') {
    return (
      <section aria-labelledby={headingId} className="flex flex-col gap-4">
        <h2 id={headingId} className="text-lg font-semibold text-ink">
          Podobni specjaliści
        </h2>
        <SimilarSkeleton />
      </section>
    );
  }

  // Pomocnicza sekcja — brak wyników nie generuje pustego nagłówka.
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold text-ink">
          Podobni specjaliści
        </h2>
        <BeBadge
          endpoint="GET /api/specialists"
          desc="Podobni specjaliści dobrani po specjalizacji (dane z zamockowanego backendu)."
        />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {visible.map((item) => (
          <li key={item.id}>
            <SimilarCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
