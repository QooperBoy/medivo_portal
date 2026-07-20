'use client';

/**
 * (specialist) /panel/rezerwacje — rezerwacje specjalisty (E4).
 *
 * Zakładki filtrują listę wg zakresu (pending / upcoming / past / history);
 * każda renderuje `BookingsBoard` z odpowiednim `scope`. Kanoniczne przejścia
 * stanów sterowane przez specjalistę: akceptacja/odrzucenie (E4), oznaczenie
 * „odbyła się” (E8), zgłoszenie nieobecności (E7) i odwołanie (E5) — obsługują
 * je karty w `BookingsBoard`. Nagłówek/nawigacja pochodzą z layoutu grupy.
 */

import { useCurrentSpecialist } from '@/components/specialist/PanelProvider';
import { BookingsBoard } from '@/components/specialist/BookingsBoard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';

function BookingsLoading() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="h-10 w-full max-w-md animate-pulse rounded-xl2 bg-surface-subtle" />
      <div className="h-40 w-full animate-pulse rounded-xl2 bg-surface-subtle" />
    </div>
  );
}

export default function PanelBookingsPage() {
  const { specialist, loading, error } = useCurrentSpecialist();

  if (loading) return <BookingsLoading />;

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-ink">Rezerwacje</h1>
        <p className="max-w-2xl text-sm text-ink-muted">
          Zarządzaj rezerwacjami wizyt: akceptuj lub odrzucaj prośby, oznaczaj
          wizyty jako odbyte, zgłaszaj nieobecność pacjenta oraz odwołuj
          potwierdzone terminy.
        </p>
        <BeBadge
          endpoint="GET /api/specialists/:id/bookings"
          desc="Lista rezerwacji z zamockowanego backendu (filtr scope, silnik G7-scoring)."
          className="self-start"
        />
      </div>

      <Tabs defaultValue="pending">
        <TabsList aria-label="Zakres rezerwacji" className="flex-wrap">
          <TabsTrigger value="pending">Do akceptacji</TabsTrigger>
          <TabsTrigger value="upcoming">Nadchodzące</TabsTrigger>
          <TabsTrigger value="past">Do potwierdzenia</TabsTrigger>
          <TabsTrigger value="history">Historia</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <BookingsBoard specialistId={specialist.id} scope="pending" />
        </TabsContent>
        <TabsContent value="upcoming">
          <BookingsBoard specialistId={specialist.id} scope="upcoming" />
        </TabsContent>
        <TabsContent value="past">
          <BookingsBoard specialistId={specialist.id} scope="past" />
        </TabsContent>
        <TabsContent value="history">
          <BookingsBoard specialistId={specialist.id} scope="history" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
