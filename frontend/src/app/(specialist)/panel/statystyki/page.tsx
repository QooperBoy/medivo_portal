'use client';

/**
 * (specialist) /panel/statystyki — Statystyki praktyki (E10).
 *
 * Renderuje wyłącznie treść sekcji (layout panelu dostarcza nagłówek i
 * nawigację). Kontekst „obecnego specjalisty" pochodzi z PanelProvider.
 *
 * Pobiera zagregowane statystyki (`GET /api/specialists/:id/stats`, silnik
 * E10-stats) i prezentuje je jako kafelki + proste wizualizacje własne (pasek
 * obłożenia i mini-słupki struktury wizyt) — bez zewnętrznych bibliotek.
 * Wszystkie liczby mają etykiety, a pasek postępu eksponuje aria-valuenow.
 * Dane są demonstracyjne (agregacje rezerwacji E1 i grafiku, silnik E10).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { PANEL_EXTRA_ENDPOINTS, type SpecialistStats } from '@/domain';
import { Button, Card, CardContent, RatingStars } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { Sparkle, Dots } from '@/components/doodles';
import { cn } from '@/lib/utils';
import { useCurrentSpecialist } from '@/components/specialist/PanelProvider';

/* ------------------------------------------------------------------ *
 * Helpery formatowania i ścieżki
 * ------------------------------------------------------------------ */

/** Ścieżka statystyk z parametrem :id podstawionym pod konkretnego specjalistę. */
function statsPath(id: string): string {
  return PANEL_EXTRA_ENDPOINTS.stats.path.replace(':id', encodeURIComponent(id));
}

/** Formatuje kwotę w pełnych złotych z separatorem tysięcy (pl-PL). */
const revenueFmt = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });

/** Przycina procent obłożenia do zakresu 0–100 (liczba całkowita). */
function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/* ------------------------------------------------------------------ *
 * Stan pobierania
 * ------------------------------------------------------------------ */

type StatsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; stats: SpecialistStats };

/* ------------------------------------------------------------------ *
 * Prezentacja — kafelki
 * ------------------------------------------------------------------ */

/** Kafelek liczbowy (etykieta → wartość → opcjonalna podpowiedź) jako para w `<dl>`. */
function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card">
      <dt className="text-sm font-medium text-ink-muted">{label}</dt>
      <dd className="text-3xl font-bold tracking-tight text-brand-800">{value}</dd>
      {hint && <dd className="text-xs text-ink-subtle">{hint}</dd>}
    </div>
  );
}

/** Pasek obłożenia grafiku — własny div w kolorze marki, z semantyką progressbar. */
function OccupancyBar({ pct }: { pct: number }) {
  const value = clampPct(pct);
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Obłożenie grafiku</h2>
          <span className="text-3xl font-bold tracking-tight text-brand-800 tabular-nums">
            {value}%
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Obłożenie grafiku: ${value} procent`}
          className="h-4 w-full overflow-hidden rounded-full bg-surface-subtle"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-500"
            style={{ width: `${value}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-ink-subtle">
          <span>0%</span>
          <span>Zajęte terminy względem wszystkich dostępnych</span>
          <span>100%</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface VisitBar {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly barClass: string;
}

/** Mini-słupki struktury wizyt — własne divy w palecie marki (bez bibliotek). */
function VisitStructure({ bars }: { bars: readonly VisitBar[] }) {
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-ink">Struktura wizyt</h2>
          <Sparkle className="h-4 w-4 text-brand-400" />
        </div>

        <ul className="flex flex-col gap-3">
          {bars.map((bar) => (
            <li key={bar.key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm text-ink-muted">
                {bar.label}
              </span>
              <span
                aria-hidden="true"
                className="relative h-3 flex-1 overflow-hidden rounded-full bg-surface-subtle"
              >
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    bar.barClass,
                  )}
                  style={{ width: `${(bar.value / maxValue) * 100}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
                {bar.value}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Szkielet ładowania
 * ------------------------------------------------------------------ */

const TILE_SKELETONS = ['t1', 't2', 't3', 't4', 't5', 't6'] as const;

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {TILE_SKELETONS.map((id) => (
          <div
            key={id}
            className="flex flex-col gap-3 rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card"
          >
            <div className="h-4 w-24 animate-pulse rounded bg-surface-subtle" />
            <div className="h-8 w-16 animate-pulse rounded bg-surface-subtle" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl2 bg-surface-subtle" />
        <div className="h-40 animate-pulse rounded-xl2 bg-surface-subtle" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Strona
 * ------------------------------------------------------------------ */

export default function StatystykiPage() {
  const { specialist, loading, error } = useCurrentSpecialist();
  const [state, setState] = useState<StatsState>({ status: 'loading' });

  const specialistId = specialist?.id ?? null;

  const loadStats = useCallback(async (id: string) => {
    setState({ status: 'loading' });
    try {
      const res = await apiClient.get<SpecialistStats>(statsPath(id));
      if (res.status >= 400) {
        setState({
          status: 'error',
          message: 'Nie udało się wczytać statystyk z zamockowanego backendu.',
        });
        return;
      }
      setState({ status: 'ready', stats: res.data });
    } catch {
      setState({
        status: 'error',
        message: 'Błąd połączenia z zamockowanym backendem.',
      });
    }
  }, []);

  useEffect(() => {
    if (!specialistId) return;
    void loadStats(specialistId);
  }, [specialistId, loadStats]);

  const header = (
    <header className="relative flex flex-col gap-3">
      <Dots className="pointer-events-none absolute -top-2 right-0 hidden h-12 w-12 text-brand-100 md:block" />
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          Statystyki praktyki
          <Sparkle className="h-5 w-5 text-brand-500" />
        </h1>
        <p className="max-w-2xl text-sm text-ink-muted">
          Podsumowanie rezerwacji, opinii i obłożenia grafiku. Wartości liczone są
          na żywo z Twoich danych.
        </p>
      </div>
      <BeBadge
        endpoint="GET /api/specialists/:id/stats"
        desc="Statystyki pochodzą z zamockowanego backendu (MSW): silnik E10-stats agreguje rezerwacje (E1) i grafik."
        className="self-start"
      />
    </header>
  );

  // Stan wczytywania profilu specjalisty (PanelProvider).
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <StatsSkeleton />
      </div>
    );
  }

  if (error || !specialist) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p
          role="alert"
          className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          {error ?? 'Nie udało się wczytać profilu specjalisty.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <StatsSkeleton />}

        {state.status === 'error' && (
          <div className="flex flex-col items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-4">
            <p role="alert" className="text-sm text-danger-700">
              {state.message}
            </p>
            <Button
              variant="secondary"
              onClick={() => void loadStats(specialist.id)}
            >
              Spróbuj ponownie
            </Button>
          </div>
        )}

        {state.status === 'ready' && (
          <StatsView stats={state.stats} />
        )}
      </div>

      <p className="max-w-2xl text-xs text-ink-subtle">
        Dane demonstracyjne. Statystyki są agregacją rezerwacji (E1) i grafiku w
        zamockowanym backendzie (silnik E10) — nie odzwierciedlają realnej praktyki.
      </p>
    </div>
  );
}

/** Widok gotowych statystyk (kafelki + wizualizacje). */
function StatsView({ stats }: { stats: SpecialistStats }) {
  const visitBars: readonly VisitBar[] = [
    {
      key: 'completed',
      label: 'Odbyte',
      value: stats.completedCount,
      barClass: 'bg-brand-600',
    },
    {
      key: 'upcoming',
      label: 'Nadchodzące',
      value: stats.upcomingCount,
      barClass: 'bg-brand-500',
    },
    {
      key: 'noShow',
      label: 'Nieobecności',
      value: stats.noShowCount,
      barClass: 'bg-brand-400',
    },
    {
      key: 'cancelled',
      label: 'Odwołania',
      value: stats.cancelledCount,
      barClass: 'bg-brand-300',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Kafelki liczbowe */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="Nadchodzące wizyty"
          value={stats.upcomingCount}
          hint="Potwierdzone w przyszłości"
        />
        <StatTile
          label="Wizyty odbyte"
          value={stats.completedCount}
          hint="Zrealizowane wizyty"
        />
        <StatTile
          label="Nieobecności"
          value={stats.noShowCount}
          hint="Pacjent nie stawił się na wizytę"
        />
        <StatTile
          label="Odwołania"
          value={stats.cancelledCount}
          hint="Wizyty anulowane"
        />
        <StatTile
          label="Liczba opinii"
          value={stats.reviewsCount}
          hint="Zatwierdzone opinie"
        />
        <div className="flex flex-col gap-1 rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card">
          <dt className="text-sm font-medium text-ink-muted">Średnia ocena</dt>
          <dd className="mt-1">
            <RatingStars value={stats.ratingAvg} />
          </dd>
          <dd className="text-xs text-ink-subtle">Skala od 1 do 5</dd>
        </div>
      </dl>

      {/* Wizualizacje: obłożenie + przychód */}
      <div className="grid gap-4 lg:grid-cols-2">
        <OccupancyBar pct={stats.occupancyPct} />

        <Card>
          <CardContent className="flex h-full flex-col justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
                  <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6" />
                  <path d="M16 12.5h.01" />
                </svg>
              </span>
              <h2 className="text-base font-semibold text-ink">
                Szacowany przychód
              </h2>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold tracking-tight text-brand-800 tabular-nums">
                {revenueFmt.format(stats.revenueEstimatePln)} zł
              </span>
              <span className="text-xs text-ink-subtle">
                Suma cen wizyt odbytych (szacunek)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wizualizacja: struktura wizyt */}
      <VisitStructure bars={visitBars} />
    </div>
  );
}
