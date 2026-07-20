'use client';

/**
 * DashboardOverview — treść pulpitu specjalisty (E1). Pobiera wszystkie
 * rezerwacje (`GET /api/specialists/:id/bookings?scope=all`) i wylicza klientowo
 * kafelki (Dzisiaj / Do akceptacji / Nadchodzące / Do potwierdzenia), listę
 * dzisiejszych wizyt oraz podgląd próśb o akceptację. Alerty (opinie E8,
 * subskrypcja E12) są statyczne i wyraźnie oznaczone jako dane demonstracyjne.
 * Strefa czasowa: Europe/Warsaw. Obsługuje loading (skeleton) i error.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { BookingState } from '@/domain';
import type {
  BookingListItem,
  Specialist,
  SpecialistBookingsResponse,
} from '@/domain';
import { Button, Card, CardContent, Chip } from '@/components/ui';
import { BookingStateBadge } from '@/components/patient/BookingStateBadge';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { CalmScene } from '@/components/illustrations';
import { Sparkle } from '@/components/doodles';

const TZ = 'Europe/Warsaw';
const BOOKINGS_HREF = '/panel/rezerwacje';

const dayKeyFmt = new Intl.DateTimeFormat('pl-PL', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  timeZone: TZ,
});
const timeFmt = new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

/** Klucz dnia kalendarzowego w strefie Europe/Warsaw (YYYY-MM-DD). */
function warsawDayKey(date: Date): string {
  const parts = dayKeyFmt.formatToParts(date);
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

interface DerivedBookings {
  today: BookingListItem[];
  toAccept: BookingListItem[];
  upcoming: BookingListItem[];
  toConfirm: BookingListItem[];
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card"
          >
            <div className="h-9 w-12 animate-pulse rounded bg-surface-subtle" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface-subtle" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-56 animate-pulse rounded-xl2 bg-surface-subtle lg:col-span-2" />
        <div className="h-56 animate-pulse rounded-xl2 bg-surface-subtle" />
      </div>
    </div>
  );
}

interface StatTile {
  key: string;
  label: string;
  value: number;
  hint: string;
}

function StatTiles({ tiles }: { tiles: readonly StatTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Link
          key={tile.key}
          href={BOOKINGS_HREF}
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

/** Wiersz dzisiejszej wizyty: godzina + usługa + pacjent + stan. */
function TodayRow({ booking }: { booking: BookingListItem }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex min-w-[3.25rem] justify-center rounded-lg bg-brand-50 px-2 py-1 text-sm font-semibold text-brand-800">
          {timeFmt.format(new Date(booking.startsAt))}
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-ink">
            {booking.serviceName}
          </span>
          {/* RODO: dane minimalne — wyłącznie imię i nazwisko pacjenta. */}
          <span className="text-xs text-ink-subtle">{booking.patientName}</span>
        </div>
      </div>
      <BookingStateBadge state={booking.state} />
    </li>
  );
}

/** Wiersz podglądu prośby o akceptację (pending_approval). */
function PendingRow({ booking }: { booking: BookingListItem }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        {/* RODO: dane minimalne — imię i nazwisko pacjenta. */}
        <span className="text-sm font-medium text-ink">
          {booking.patientName}
        </span>
        {booking.patientNoShowCount > 0 && (
          <Chip
            variant="outline"
            title="Wskaźnik nieobecności pochodzi ze scoringu pacjenta (silnik G7)."
            className="border-warning-200 bg-warning-50 text-warning-700"
          >
            Nieobecności: {booking.patientNoShowCount}
          </Chip>
        )}
      </div>
      <span className="text-xs text-ink-muted">
        {booking.serviceName} · {dateFmt.format(new Date(booking.startsAt))},
        godz. {timeFmt.format(new Date(booking.startsAt))}
      </span>
    </li>
  );
}

export function DashboardOverview({ specialist }: { specialist: Specialist }) {
  const [items, setItems] = useState<BookingListItem[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    void (async () => {
      try {
        const res = await apiClient.get<SpecialistBookingsResponse>(
          `/api/specialists/${specialist.id}/bookings?scope=all`,
        );
        if (cancelled) return;
        if (res.status >= 400) {
          setStatus('error');
          return;
        }
        setItems(res.data.items);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [specialist.id, reloadKey]);

  const derived = useMemo<DerivedBookings>(() => {
    const list = items ?? [];
    const now = new Date();
    const todayKey = warsawDayKey(now);
    const nowMs = now.getTime();

    const confirmed = list.filter((b) => b.state === BookingState.Confirmed);
    const byStartAsc = (a: BookingListItem, b: BookingListItem) =>
      a.startsAt.localeCompare(b.startsAt);

    return {
      today: confirmed
        .filter((b) => warsawDayKey(new Date(b.startsAt)) === todayKey)
        .sort(byStartAsc),
      toAccept: list
        .filter((b) => b.state === BookingState.PendingApproval)
        .sort(byStartAsc),
      upcoming: confirmed.filter((b) => new Date(b.startsAt).getTime() > nowMs),
      toConfirm: confirmed.filter(
        (b) => new Date(b.startsAt).getTime() <= nowMs,
      ),
    };
  }, [items]);

  const greeting = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Sparkle className="h-5 w-5 text-brand-500" />
        <h1 className="text-xl font-semibold text-ink">
          Dzień dobry, {specialist.firstName}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-ink-muted">
          Oto podsumowanie Twojego dnia i rezerwacji do obsługi.
        </p>
        <BeBadge
          endpoint="GET /api/specialists/:id/bookings"
          desc="Dane pulpitu pochodzą z zamockowanego backendu (scope=all, silnik G7-scoring)."
        />
      </div>
    </div>
  );

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-6">
        {greeting}
        <DashboardSkeleton />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-6">
        {greeting}
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-5"
        >
          <p className="text-sm font-medium text-danger-700">
            Nie udało się wczytać danych pulpitu z zamockowanego backendu.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  const tiles: readonly StatTile[] = [
    {
      key: 'today',
      label: 'Dzisiaj',
      value: derived.today.length,
      hint: 'Potwierdzone wizyty na dziś',
    },
    {
      key: 'toAccept',
      label: 'Do akceptacji',
      value: derived.toAccept.length,
      hint: 'Prośby oczekujące na decyzję',
    },
    {
      key: 'upcoming',
      label: 'Nadchodzące',
      value: derived.upcoming.length,
      hint: 'Potwierdzone w przyszłości',
    },
    {
      key: 'toConfirm',
      label: 'Do potwierdzenia',
      value: derived.toConfirm.length,
      hint: 'Po terminie — do oznaczenia',
    },
  ];

  const pendingPreview = derived.toAccept.slice(0, 3);
  const pendingMore = derived.toAccept.length - pendingPreview.length;

  return (
    <div className="flex flex-col gap-6">
      {greeting}

      <StatTiles tiles={tiles} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Dzisiejsze wizyty */}
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">
                Dzisiejsze wizyty
              </h2>
              <Link
                href={BOOKINGS_HREF}
                className="rounded text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                Wszystkie rezerwacje
              </Link>
            </div>

            {derived.today.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CalmScene className="h-28 w-40" />
                <p className="text-sm font-medium text-ink">Brak wizyt na dziś</p>
                <p className="max-w-xs text-xs text-ink-muted">
                  Kiedy masz zaplanowany dzień wolny, to dobry moment na
                  odpoczynek.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {derived.today.map((booking) => (
                  <TodayRow key={booking.id} booking={booking} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Prośby o akceptację */}
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">
                Prośby o akceptację
              </h2>
              {derived.toAccept.length > 0 && (
                <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-warning-100 px-2 text-xs font-semibold text-warning-700">
                  {derived.toAccept.length}
                </span>
              )}
            </div>

            {pendingPreview.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Brak nowych próśb — wszystko na bieżąco.
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {pendingPreview.map((booking) => (
                    <PendingRow key={booking.id} booking={booking} />
                  ))}
                </ul>
                {pendingMore > 0 && (
                  <p className="text-xs text-ink-subtle">
                    oraz {pendingMore} więcej w zakładce Rezerwacje
                  </p>
                )}
              </>
            )}

            <Link
              href={BOOKINGS_HREF}
              className="mt-auto inline-flex h-11 items-center justify-center rounded-xl2 border border-brand-600 px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              Przejdź do rezerwacji
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Alerty informacyjne — dane demonstracyjne (E8 / E12) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h12v9H8l-4 3z" />
              </svg>
            </span>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">
                  Nowe opinie do odpowiedzi
                </h3>
                <Chip variant="outline">dane demonstracyjne</Chip>
              </div>
              <p className="text-sm text-ink-muted">
                Masz opinie pacjentów oczekujące na odpowiedź. Moduł opinii (E8)
                pojawi się w kolejnej iteracji.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-100 text-warning-700"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 2l7 4v4c0 4-3 7-7 8-4-1-7-4-7-8V6z" />
              </svg>
            </span>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">
                  Status subskrypcji: okres próbny
                </h3>
                <Chip variant="outline">dane demonstracyjne</Chip>
              </div>
              <p className="text-sm text-ink-muted">
                Twój okres próbny jest aktywny. Zarządzanie subskrypcją (E12)
                pojawi się w kolejnej iteracji.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
