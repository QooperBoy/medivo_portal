'use client';

/**
 * SearchClient — logika ekranu wyszukiwania (A2/A3).
 *
 * - Stan początkowy filtrów czytany z `useSearchParams` (q/city/specialization/mode).
 * - Efekt zależny od aktywnych filtrów: buduje querystring, SYNCHRONIZUJE URL
 *   (`router.replace`, bez przeładowania) i woła `apiClient.get` na
 *   `/api/specialists`. Każde żądanie loguje się w BE Inspectorze (robi to
 *   `apiClient`), a nagłówek `x-engine` pokazujemy jako „obsłużone przez".
 * - Pole `q` jest debounce'owane (300 ms); pozostałe filtry działają od razu.
 * - Stan pobierania jako dyskryminowany union: loading | success | error.
 */
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { SpecialistsListResponse } from '@/domain';
import { Button, Chip } from '@/components/ui';
import { EmptyResults } from '@/components/illustrations';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { SearchFilters, type ModeFilter } from '@/components/patient/SearchFilters';
import { SpecialistResultCard } from '@/components/patient/SpecialistResultCard';
import { ResultsSkeleton } from '@/components/patient/ResultsSkeleton';

interface Filters {
  q: string;
  city: string;
  specialization: string;
  mode: ModeFilter;
}

type FetchState =
  | { status: 'loading' }
  | { status: 'success'; data: SpecialistsListResponse; engine: string | null }
  | { status: 'error'; message: string };

/** Zawężenie parametru trybu z URL do dozwolonych wartości UI. */
function parseMode(value: string | null): ModeFilter {
  return value === 'online' || value === 'stacjonarnie' ? value : '';
}

/** Kapitalizacja pierwszej litery etykiet (dane trzymane małą literą). */
function capitalizeFirst(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Buduje querystring pomijając puste filtry (kolejność stabilna). */
function buildQueryString(filters: Filters): string {
  const params = new URLSearchParams();
  const q = filters.q.trim();
  if (q) params.set('q', q);
  if (filters.city) params.set('city', filters.city);
  if (filters.specialization) params.set('specialization', filters.specialization);
  if (filters.mode) params.set('mode', filters.mode);
  return params.toString();
}

/** Etykieta liczby wyników z poprawną odmianą (1 vs pozostałe). */
function formatFoundLabel(total: number): string {
  return total === 1 ? 'Znaleziono 1 specjalistę' : `Znaleziono ${total} specjalistów`;
}

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(() => ({
    q: searchParams.get('q') ?? '',
    city: searchParams.get('city') ?? '',
    specialization: searchParams.get('specialization') ?? '',
    mode: parseMode(searchParams.get('mode')),
  }));
  const [debouncedQ, setDebouncedQ] = useState<string>(filters.q);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  // Debounce pola frazy (300 ms) — bez zbędnych żądań przy pisaniu.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(handle);
  }, [filters.q]);

  const { city, specialization, mode } = filters;

  // Pobranie danych + synchronizacja URL. Zależne od aktywnych filtrów.
  useEffect(() => {
    void reloadKey; // obecność w zależnościach wymusza refetch po „Spróbuj ponownie".
    const queryString = buildQueryString({ q: debouncedQ, city, specialization, mode });
    router.replace(queryString ? `/szukaj?${queryString}` : '/szukaj', { scroll: false });

    let cancelled = false;
    setState({ status: 'loading' });

    apiClient
      .get<SpecialistsListResponse>(`/api/specialists${queryString ? `?${queryString}` : ''}`)
      .then((result) => {
        if (cancelled) return;
        if (result.status >= 400) {
          setState({
            status: 'error',
            message: `Nie udało się pobrać wyników (kod ${result.status}).`,
          });
          return;
        }
        setState({ status: 'success', data: result.data, engine: result.engine });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: 'Nie udało się połączyć z backendem. Sprawdź połączenie i spróbuj ponownie.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQ, city, specialization, mode, reloadKey, router]);

  const handleQChange = (value: string) => setFilters((prev) => ({ ...prev, q: value }));
  const handleCityChange = (value: string) => setFilters((prev) => ({ ...prev, city: value }));
  const handleSpecializationChange = (value: string) =>
    setFilters((prev) => ({ ...prev, specialization: value }));
  const handleModeChange = (value: ModeFilter) => setFilters((prev) => ({ ...prev, mode: value }));

  const clearAll = () => {
    setFilters({ q: '', city: '', specialization: '', mode: '' });
    setDebouncedQ('');
  };
  const retry = () => setReloadKey((key) => key + 1);

  // Aktywne filtry (do prezentacji jako usuwalne chipy).
  const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];
  if (filters.q.trim()) {
    activeFilters.push({
      key: 'q',
      label: `„${filters.q.trim()}”`,
      onRemove: () => {
        setFilters((prev) => ({ ...prev, q: '' }));
        setDebouncedQ('');
      },
    });
  }
  if (filters.city) {
    activeFilters.push({
      key: 'city',
      label: filters.city,
      onRemove: () => setFilters((prev) => ({ ...prev, city: '' })),
    });
  }
  if (filters.specialization) {
    activeFilters.push({
      key: 'specialization',
      label: capitalizeFirst(filters.specialization),
      onRemove: () => setFilters((prev) => ({ ...prev, specialization: '' })),
    });
  }
  if (filters.mode) {
    activeFilters.push({
      key: 'mode',
      label: filters.mode === 'online' ? 'Online' : 'Stacjonarnie',
      onRemove: () => setFilters((prev) => ({ ...prev, mode: '' })),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <SearchFilters
        q={filters.q}
        city={filters.city}
        specialization={filters.specialization}
        mode={filters.mode}
        onQChange={handleQChange}
        onCityChange={handleCityChange}
        onSpecializationChange={handleSpecializationChange}
        onModeChange={handleModeChange}
      />

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-muted">Aktywne filtry:</span>
          {activeFilters.map((filter) => (
            <Chip
              key={filter.key}
              variant="brand"
              onRemove={filter.onRemove}
              removeLabel={`Usuń filtr: ${filter.label}`}
            >
              {filter.label}
            </Chip>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Wyczyść filtry
          </Button>
        </div>
      )}

      <section className="flex flex-col gap-4">
        {state.status === 'loading' && <ResultsSkeleton />}

        {state.status === 'error' && (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 rounded-xl2 border border-danger-200 bg-danger-50 p-8 text-center"
          >
            <p className="text-sm text-danger-700">{state.message}</p>
            <Button variant="outline" onClick={retry}>
              Spróbuj ponownie
            </Button>
          </div>
        )}

        {state.status === 'success' && state.data.total === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl2 border border-slate-200/70 bg-white p-10 text-center shadow-card">
            <EmptyResults className="h-32 w-32" />
            <div className="flex flex-col gap-1">
              <h2 role="status" className="text-lg font-semibold text-ink">
                Brak specjalistów dla wybranych filtrów
              </h2>
              <p className="text-sm text-ink-muted">
                Spróbuj zmienić miasto, tryb wizyty lub metodę terapii.
              </p>
            </div>
            <Button variant="primary" onClick={clearAll}>
              Wyczyść filtry
            </Button>
          </div>
        )}

        {state.status === 'success' && state.data.total > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 role="status" className="text-lg font-semibold text-ink">
                {formatFoundLabel(state.data.total)}
              </h2>
              <div className="flex items-center gap-2">
                <BeBadge
                  endpoint="GET /api/specialists"
                  desc="Wyniki pochodzą z zamockowanego backendu (MSW) i są logowane w panelu BE Inspector."
                />
                {state.engine && (
                  <span className="text-xs text-ink-subtle">
                    obsłużone przez: {state.engine}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {state.data.items.map((specialist) => (
                <SpecialistResultCard key={specialist.id} specialist={specialist} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
