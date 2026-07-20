'use client';

/**
 * (admin) /admin — Pulpit back office (F).
 *
 * Guard roli admina i nawigacja są w layoucie grupy (admin) — tutaj renderujemy
 * wyłącznie treść. Pobieramy równolegle liczby z list panelu (weryfikacje F1,
 * opinie F2, spory F3 — wymagane; nadużycia F4 i konta F5 — opcjonalnie) i
 * prezentujemy kafelki z liczbami oraz krótki podgląd najpilniejszych pozycji
 * (najstarsza weryfikacja, najstarszy spór).
 *
 * Daty formatowane w strefie Europe/Warsaw (Intl).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient, type ApiResult } from '@/lib/api-client';
import type {
  AbuseFlagsResponse,
  AdminDisputeItem,
  AdminDisputesResponse,
  AdminReviewItem,
  AdminReviewsResponse,
  AdminUsersResponse,
  AdminVerificationItem,
  AdminVerificationsResponse,
} from '@/domain';
import { Card, CardContent, Button } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { ShieldCheck } from '@/components/illustrations';
import { Dots, Sparkle } from '@/components/doodles';

/* ------------------------------------------------------------------ *
 * Formatowanie
 * ------------------------------------------------------------------ */

const TZ = 'Europe/Warsaw';
const dateTimeFmt = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

function formatWarsaw(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateTimeFmt.format(date);
}

/* ------------------------------------------------------------------ *
 * Pobieranie danych
 * ------------------------------------------------------------------ */

type LoadStatus = 'loading' | 'ready' | 'error';

interface DashboardData {
  verifications: AdminVerificationItem[];
  reviews: AdminReviewItem[];
  disputes: AdminDisputeItem[];
  /** Liczba otwartych zgłoszeń nadużyć (F4); `null` gdy niedostępne. */
  abuseOpen: number | null;
  /** Liczba kont użytkowników (F5); `null` gdy niedostępne. */
  usersCount: number | null;
}

/** Wyciąga `items` z wyniku `allSettled`, albo `null` przy błędzie/4xx. */
function itemsOf<T>(
  result: PromiseSettledResult<ApiResult<{ items: T[] }>>,
): T[] | null {
  if (result.status !== 'fulfilled') return null;
  const res = result.value;
  if (res.status >= 400 || !Array.isArray(res.data?.items)) return null;
  return res.data.items;
}

/* ------------------------------------------------------------------ *
 * Kafelki
 * ------------------------------------------------------------------ */

interface Tile {
  key: string;
  label: string;
  href: string;
  value: number | string;
  hint: string;
}

function TileGrid({ tiles }: { tiles: readonly Tile[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <Link
          key={tile.key}
          href={tile.href}
          className="group flex flex-col gap-1 rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <span className="text-3xl font-bold text-brand-800">{tile.value}</span>
          <span className="text-sm font-semibold text-ink">{tile.label}</span>
          <span className="text-xs text-ink-subtle">{tile.hint}</span>
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Ekran
 * ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [data, setData] = useState<DashboardData | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [verRes, revRes, disRes, abuseRes, usersRes] = await Promise.allSettled([
        apiClient.get<AdminVerificationsResponse>('/api/admin/verifications'),
        apiClient.get<AdminReviewsResponse>('/api/admin/reviews'),
        apiClient.get<AdminDisputesResponse>('/api/admin/disputes'),
        apiClient.get<AbuseFlagsResponse>('/api/admin/abuse-flags'),
        apiClient.get<AdminUsersResponse>('/api/admin/users'),
      ]);

      const verifications = itemsOf(verRes);
      const reviews = itemsOf(revRes);
      const disputes = itemsOf(disRes);

      // Trzy główne listy są wymagane — brak którejkolwiek = błąd pulpitu.
      if (!verifications || !reviews || !disputes) {
        setStatus('error');
        return;
      }

      const abuse = itemsOf(abuseRes);
      const users = itemsOf(usersRes);

      setData({
        verifications,
        reviews,
        disputes,
        abuseOpen: abuse ? abuse.filter((f) => f.status === 'open').length : null,
        usersCount: users ? users.length : null,
      });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const header = (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-brand-500" />
          <h2 className="text-xl font-semibold text-ink">Pulpit administratora</h2>
        </div>
        <p className="max-w-2xl text-sm text-ink-muted">
          Przegląd kolejek wymagających działania: weryfikacje PWZ, moderacja
          opinii i spory o nieobecność.
        </p>
        <BeBadge
          endpoint="GET /api/admin/*"
          desc="Liczby pulpitu pochodzą z zamockowanego backendu (MSW): verifications, reviews, disputes, abuse-flags, users."
          className="mt-1 self-start"
        />
      </div>
      <ShieldCheck className="hidden h-20 w-20 shrink-0 sm:block" />
    </header>
  );

  if (status === 'loading') {
    return (
      <section className="flex flex-col gap-6">
        {header}
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl2 bg-surface-subtle" />
          ))}
        </div>
      </section>
    );
  }

  if (status === 'error' || !data) {
    return (
      <section className="flex flex-col gap-6">
        {header}
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm font-medium text-danger-700" role="alert">
              Nie udało się wczytać danych pulpitu z zamockowanego backendu.
            </p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const tiles: readonly Tile[] = [
    {
      key: 'verifications',
      label: 'Weryfikacje PWZ',
      href: '/admin/weryfikacje',
      value: data.verifications.length,
      hint: 'Zgłoszenia w kolejce ręcznej (F1)',
    },
    {
      key: 'reviews',
      label: 'Opinie do moderacji',
      href: '/admin/opinie',
      value: data.reviews.length,
      hint: 'Opinie oczekujące na decyzję (F2)',
    },
    {
      key: 'disputes',
      label: 'Otwarte spory',
      href: '/admin/spory',
      value: data.disputes.length,
      hint: 'Rezerwacje w stanie sporu (F3)',
    },
    {
      key: 'users',
      label: 'Użytkownicy',
      href: '/admin/uzytkownicy',
      value: data.usersCount ?? '—',
      hint: 'Konta w systemie (F5)',
    },
    {
      key: 'abuse',
      label: 'Nadużycia',
      href: '/admin/naduzycia',
      value: data.abuseOpen ?? '—',
      hint: 'Otwarte zgłoszenia nadużyć (F4)',
    },
    {
      key: 'audit',
      label: 'Audyt',
      href: '/admin/audyt',
      value: '→',
      hint: 'Dziennik operacji (F10)',
    },
  ];

  const oldestVerification = data.verifications.reduce<AdminVerificationItem | null>(
    (acc, v) =>
      !acc || Date.parse(v.submittedAt) < Date.parse(acc.submittedAt) ? v : acc,
    null,
  );
  const oldestDispute = data.disputes.reduce<AdminDisputeItem | null>(
    (acc, d) =>
      !acc || Date.parse(d.startsAt) < Date.parse(acc.startsAt) ? d : acc,
    null,
  );

  return (
    <section className="flex flex-col gap-6">
      {header}

      <TileGrid tiles={tiles} />

      {/* Najpilniejsze pozycje */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-ink">
                Najstarsza weryfikacja
              </h3>
              <Dots className="h-4 w-8 text-brand-300" />
            </div>
            {oldestVerification ? (
              <div className="flex flex-col gap-2 rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-3">
                <p className="text-sm font-medium text-ink">
                  {oldestVerification.specialistName}
                </p>
                <p className="text-xs text-ink-muted">
                  PWZ {oldestVerification.pwzNumber} ({oldestVerification.registry})
                  {(() => {
                    const submitted = formatWarsaw(oldestVerification.submittedAt);
                    return submitted ? ` · zgłoszono ${submitted}` : '';
                  })()}
                </p>
                <Link
                  href="/admin/weryfikacje"
                  className="mt-1 rounded text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  Przejdź do kolejki weryfikacji
                </Link>
              </div>
            ) : (
              <p className="rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-6 text-center text-sm text-ink-muted">
                Kolejka weryfikacji jest pusta.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-ink">Najstarszy spór</h3>
              <Dots className="h-4 w-8 text-brand-300" />
            </div>
            {oldestDispute ? (
              <div className="flex flex-col gap-2 rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-3">
                <p className="text-sm font-medium text-ink">
                  {oldestDispute.specialistName}
                </p>
                <p className="text-xs text-ink-muted">
                  {oldestDispute.serviceName}
                  {(() => {
                    const term = formatWarsaw(oldestDispute.startsAt);
                    return term ? ` · termin ${term}` : '';
                  })()}
                </p>
                <Link
                  href="/admin/spory"
                  className="mt-1 rounded text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  Przejdź do sporów
                </Link>
              </div>
            ) : (
              <p className="rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-6 text-center text-sm text-ink-muted">
                Brak otwartych sporów.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
