'use client';

/**
 * (specialist) /panel/uslugi — Usługi i ceny (E3).
 *
 * Renderuje wyłącznie treść sekcji (layout panelu dostarcza nagłówek i
 * nawigację). Kontekst „obecnego specjalisty" pochodzi z PanelProvider.
 */

import { BeBadge } from '@/components/be-inspector/BeBadge';
import { ServicesManager } from '@/components/specialist/ServicesManager';
import { useCurrentSpecialist } from '@/components/specialist/PanelProvider';

export default function UslugiPage() {
  const { specialist, loading, error } = useCurrentSpecialist();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink">Usługi i ceny</h1>
          <p className="max-w-2xl text-sm text-ink-muted">
            Usługi wybierasz ze słownika; ustawiasz cenę, czas i tryb realizacji.
          </p>
        </div>
        <BeBadge
          endpoint="GET /api/service-catalog"
          desc="Słownik usług (F8) oraz operacje na cenniku pochodzą z zamockowanego backendu (MSW): silnik E3-services."
          className="self-start"
        />
      </header>

      {loading && <PanelSkeleton />}

      {!loading && error && (
        <p
          role="alert"
          className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          {error}
        </p>
      )}

      {!loading && !error && specialist && (
        <ServicesManager
          specialistId={specialist.id}
          specialistSlug={specialist.slug}
        />
      )}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Wczytuję dane specjalisty…</span>
      <div
        aria-hidden="true"
        className="h-40 animate-pulse rounded-xl2 bg-surface-subtle"
      />
      <div
        aria-hidden="true"
        className="h-24 animate-pulse rounded-xl2 bg-surface-subtle"
      />
    </div>
  );
}
