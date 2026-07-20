'use client';

/**
 * SearchFilters — kontrolowany panel filtrów wyszukiwarki (A3).
 * Pola: fraza `q` (input z ikoną), miasto (select), tryb wizyty (segmentowany
 * przełącznik na `Tabs`) oraz metoda terapii (pojedynczy wybór — chip-toggle
 * z `aria-pressed`). Wartości i callbacki pochodzą od `SearchClient`.
 *
 * Opcje miast/specjalizacji odzwierciedlają seed mocka (patrz `@/mocks/db`).
 */
import { useId } from 'react';
import { Card, CardContent, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Tryb wizyty w UI — „obie" celowo pominięte (patrz kontrakt A3). */
export type ModeFilter = '' | 'online' | 'stacjonarnie';

/** Miasta obecne w seedzie mocka. */
export const CITIES = [
  'Warszawa',
  'Kraków',
  'Wrocław',
  'Poznań',
  'Gdańsk',
  'Łódź',
] as const;

/** Metody/specjalizacje obecne w seedzie mocka (filtr `specialization` = substring). */
export const SPECIALIZATIONS = [
  'terapia poznawczo-behawioralna',
  'terapia psychodynamiczna',
  'terapia par',
  'terapia par i rodzin',
  'terapia dzieci i młodzieży',
  'terapia uzależnień',
  'terapia schematów',
  'psychotraumatologia',
  'zaburzenia lękowe',
  'zaburzenia depresyjne',
] as const;

export interface SearchFiltersProps {
  q: string;
  city: string;
  specialization: string;
  mode: ModeFilter;
  onQChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSpecializationChange: (value: string) => void;
  onModeChange: (value: ModeFilter) => void;
}

/** Kapitalizacja pierwszej litery etykiet (dane trzymane małą literą). */
function capitalizeFirst(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function SearchFilters({
  q,
  city,
  specialization,
  mode,
  onQChange,
  onCityChange,
  onSpecializationChange,
  onModeChange,
}: SearchFiltersProps) {
  const qId = useId();
  const cityId = useId();
  const specLabelId = useId();

  // Tryb: mapujemy pusty filtr na wartość „all" wymaganą przez Tabs.
  const modeValue = mode === '' ? 'all' : mode;
  function handleModeChange(next: string): void {
    onModeChange(next === 'online' ? 'online' : next === 'stacjonarnie' ? 'stacjonarnie' : '');
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        {/* Fraza */}
        <div>
          <label htmlFor={qId} className="mb-1.5 block text-sm font-medium text-ink">
            Szukaj
          </label>
          <div className="relative">
            <SearchIcon />
            <input
              id={qId}
              type="search"
              value={q}
              onChange={(event) => onQChange(event.target.value)}
              autoComplete="off"
              placeholder="Imię, nazwisko lub metoda terapii…"
              className="h-11 w-full rounded-xl2 border border-slate-200 bg-surface-muted pl-10 pr-4 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Miasto */}
          <div>
            <label htmlFor={cityId} className="mb-1.5 block text-sm font-medium text-ink">
              Miasto
            </label>
            <select
              id={cityId}
              value={city}
              onChange={(event) => onCityChange(event.target.value)}
              className="h-11 w-full rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <option value="">Wszystkie miasta</option>
              {CITIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Tryb wizyty */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Tryb wizyty</span>
            <Tabs defaultValue="all" value={modeValue} onValueChange={handleModeChange}>
              <TabsList aria-label="Tryb wizyty" className="flex w-full">
                <TabsTrigger value="all" className="flex-1">
                  Wszystkie
                </TabsTrigger>
                <TabsTrigger value="online" className="flex-1">
                  Online
                </TabsTrigger>
                <TabsTrigger value="stacjonarnie" className="flex-1">
                  Stacjonarnie
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Metoda terapii — pojedynczy wybór */}
        <div>
          <span id={specLabelId} className="mb-1.5 block text-sm font-medium text-ink">
            Metoda terapii
          </span>
          <div role="group" aria-labelledby={specLabelId} className="flex flex-wrap gap-2">
            {SPECIALIZATIONS.map((option) => {
              const selected = specialization === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSpecializationChange(selected ? '' : option)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1',
                    selected
                      ? 'border-brand-600 bg-brand-700 text-white'
                      : 'border-slate-300 bg-white text-ink-muted hover:border-brand-400 hover:text-brand-800',
                  )}
                >
                  {capitalizeFirst(option)}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Ikona lupy w polu frazy (dekoracyjna). */
function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
