'use client';

/**
 * (specialist) /panel — pulpit specjalisty (E1).
 *
 * Strona kliencka: bierze „zalogowanego” specjalistę z providera panelu
 * (`useCurrentSpecialist`) i deleguje treść do `DashboardOverview`. Nagłówek i
 * nawigacja panelu pochodzą z layoutu grupy — tu renderujemy wyłącznie treść.
 */

import { useCurrentSpecialist } from '@/components/specialist/PanelProvider';
import { DashboardOverview } from '@/components/specialist/DashboardOverview';

function PanelLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="h-6 w-56 animate-pulse rounded bg-surface-subtle" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl2 bg-surface-subtle"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-56 animate-pulse rounded-xl2 bg-surface-subtle lg:col-span-2" />
        <div className="h-56 animate-pulse rounded-xl2 bg-surface-subtle" />
      </div>
    </div>
  );
}

export default function PanelDashboardPage() {
  const { specialist, loading, error } = useCurrentSpecialist();

  if (loading) return <PanelLoading />;

  if (error || !specialist) {
    return (
      <div
        role="alert"
        className="rounded-xl2 border border-danger-200 bg-danger-50 p-5 text-sm font-medium text-danger-700"
      >
        {error ?? 'Nie udało się wczytać profilu specjalisty.'}
      </div>
    );
  }

  return <DashboardOverview specialist={specialist} />;
}
