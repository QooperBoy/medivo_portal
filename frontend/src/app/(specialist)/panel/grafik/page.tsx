'use client';

/**
 * (specialist) /panel/grafik — Grafik i dostępność (E2).
 *
 * Renderuje wyłącznie treść sekcji (layout panelu dostarcza nagłówek i
 * nawigację). Kontekst „obecnego specjalisty" pochodzi z PanelProvider.
 */

import { BeBadge } from '@/components/be-inspector/BeBadge';
import { GrafikManager } from '@/components/specialist/GrafikManager';
import { useCurrentSpecialist } from '@/components/specialist/PanelProvider';

export default function GrafikPage() {
  const { specialist, loading, error } = useCurrentSpecialist();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink">Grafik i dostępność</h1>
          <p className="max-w-2xl text-sm text-ink-muted">
            Model dostępności = godziny pracy − blokady − zajęte terminy. Blokuj
            wolne terminy, gdy nie chcesz przyjmować, i odblokowuj je w dowolnej
            chwili.
          </p>
        </div>
        <BeBadge
          endpoint="GET /api/specialists/:id/slots"
          desc="Grafik pochodzi z zamockowanego backendu (MSW). Blokady i nowe terminy obsługuje silnik E2-availability."
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
        <GrafikManager specialistId={specialist.id} />
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
        className="h-32 animate-pulse rounded-xl2 bg-surface-subtle"
      />
      <div
        aria-hidden="true"
        className="h-16 animate-pulse rounded-xl2 bg-surface-subtle"
      />
    </div>
  );
}
