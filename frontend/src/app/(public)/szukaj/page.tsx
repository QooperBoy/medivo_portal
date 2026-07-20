/**
 * (public) /szukaj — wyszukiwanie i lista wyników (A2/A3).
 *
 * Server component: renderuje statyczny nagłówek sekcji (ilustracja SearchSpot
 * + doodle) i owija część kliencką w Suspense — `SearchClient` używa
 * `useSearchParams`, które MUSI znajdować się w granicy Suspense (wymóg buildu
 * Next App Router). Fallbackiem jest szkielet listy wyników.
 */
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SearchClient } from '@/components/patient/SearchClient';
import { ResultsSkeleton } from '@/components/patient/ResultsSkeleton';
import { SearchSpot } from '@/components/illustrations';
import { Dots, Sparkle } from '@/components/doodles';

export const metadata: Metadata = {
  title: 'Wyszukiwarka specjalistów — ZnanyPsycholog',
  description:
    'Znajdź psychologa lub psychoterapeutę — filtruj po mieście, trybie wizyty i metodzie terapii.',
};

export default function SzukajPage() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-surface-muted p-6 shadow-card md:p-8">
        <Dots className="pointer-events-none absolute -right-3 -top-3 hidden h-24 w-24 text-brand-200 md:block" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkle className="h-3.5 w-3.5" />
              Krok 1 z 3 · Wyszukiwanie
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
              Wyszukiwarka specjalistów
            </h1>
            <p className="max-w-xl text-sm text-ink-muted md:text-base">
              Filtruj po mieście, trybie wizyty i metodzie terapii. Każde żądanie
              trafia do zamockowanego backendu i jest widoczne w panelu BE Inspector.
            </p>
          </div>
          <SearchSpot className="hidden h-28 w-28 shrink-0 sm:block lg:h-32 lg:w-32" />
        </div>
      </section>

      <Suspense fallback={<ResultsSkeleton />}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
