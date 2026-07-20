'use client';

/**
 * (patient) /moje-wizyty — lista wizyt pacjenta (B2).
 *
 * Guard i nawigacja konta pacjenta są w layoucie grupy (PatientAccountShell) —
 * tutaj renderujemy wyłącznie treść. Tożsamość pacjenta bierzemy z `useAuth()`
 * (`user.email`) i wołamy `GET /api/patients/bookings?email=`. Pozycje dzielimy
 * na „Nadchodzące" (confirmed w przyszłości) i „Historia" (reszta); każda pozycja
 * to `PatientVisitCard`. Odwołanie wizyty w karcie odświeża listę (`onChanged`).
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { BookingState } from '@/domain';
import type { PatientBookingItem, PatientBookingsResponse } from '@/domain';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  Button,
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { EmptyResults } from '@/components/illustrations';
import { PatientVisitCard } from '@/components/patient/PatientVisitCard';

type Status = 'loading' | 'ready' | 'error';

/** Link stylizowany na przycisk główny (44px tap target). */
const linkPrimary =
  'inline-flex h-11 items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';
/** Link tekstowy w treści. */
const textLink =
  'rounded font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

function SkeletonCard() {
  return (
    <div
      className="h-40 animate-pulse rounded-xl2 bg-surface-subtle"
      aria-hidden="true"
    />
  );
}

/** Pusty stan wewnątrz zakładki (brak pozycji w danej sekcji). */
function SectionEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-8 text-center text-sm text-ink-muted">
      {children}
    </p>
  );
}

export default function MojeWizytyPage() {
  const { user } = useAuth();
  const email = user?.email ?? '';

  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<PatientBookingItem[]>([]);
  const [reload, setReload] = useState(0);
  const firstLoadRef = useRef(true);

  /** Ciche odświeżenie po akcji w karcie (bez migotania szkieletu). */
  const refresh = useCallback(() => setReload((v) => v + 1), []);
  /** Ponowna próba po błędzie (z widocznym szkieletem ładowania). */
  const retry = useCallback(() => {
    firstLoadRef.current = true;
    setReload((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!email) {
      setStatus('error');
      return;
    }
    let active = true;
    if (firstLoadRef.current) setStatus('loading');

    (async () => {
      try {
        const res = await apiClient.get<PatientBookingsResponse>(
          `/api/patients/bookings?email=${encodeURIComponent(email)}`,
        );
        if (!active) return;
        if (res.status === 200 && Array.isArray(res.data?.items)) {
          setItems(res.data.items);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      } catch {
        if (active) setStatus('error');
      } finally {
        firstLoadRef.current = false;
      }
    })();

    return () => {
      active = false;
    };
  }, [email, reload]);

  const now = Date.now();
  const isUpcoming = (b: PatientBookingItem): boolean =>
    b.state === BookingState.Confirmed && Date.parse(b.startsAt) > now;

  const upcoming = items.filter(isUpcoming);
  const history = items.filter((b) => !isUpcoming(b));

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-ink">Moje wizyty</h2>
          <p className="text-sm text-ink-muted">
            Zarządzaj nadchodzącymi wizytami i przeglądaj historię.
          </p>
        </div>
        <BeBadge
          endpoint="GET /api/patients/bookings"
          desc="Lista wizyt pacjenta z zamockowanego backendu (MSW)."
        />
      </div>

      {status === 'loading' && (
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {status === 'error' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <h3 className="text-lg font-semibold text-ink">
              Nie udało się wczytać wizyt
            </h3>
            <p className="max-w-md text-sm text-ink-muted">
              {email
                ? 'Wystąpił problem z połączeniem z zamockowanym backendem (MSW). Spróbuj ponownie za chwilę.'
                : 'Zaloguj się jako pacjent, aby zobaczyć swoje wizyty.'}
            </p>
            {email && (
              <Button variant="primary" onClick={retry}>
                Spróbuj ponownie
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {status === 'ready' && items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <EmptyResults className="h-40 w-52" />
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-ink">
                Nie masz jeszcze wizyt
              </h3>
              <p className="max-w-md text-sm text-ink-muted">
                Gdy umówisz wizytę, pojawi się tutaj razem z opcjami zarządzania.
              </p>
            </div>
            <Link href="/szukaj" className={linkPrimary}>
              Znajdź specjalistę
            </Link>
          </CardContent>
        </Card>
      )}

      {status === 'ready' && items.length > 0 && (
        <Tabs defaultValue="upcoming">
          <TabsList aria-label="Filtry wizyt">
            <TabsTrigger value="upcoming">
              Nadchodzące ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="history">Historia ({history.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcoming.length > 0 ? (
              <div className="flex flex-col gap-4">
                {upcoming.map((b) => (
                  <PatientVisitCard key={b.id} booking={b} onChanged={refresh} />
                ))}
              </div>
            ) : (
              <SectionEmpty>
                Nie masz zaplanowanych wizyt.{' '}
                <Link href="/szukaj" className={textLink}>
                  Znajdź specjalistę
                </Link>
                .
              </SectionEmpty>
            )}
          </TabsContent>

          <TabsContent value="history">
            {history.length > 0 ? (
              <div className="flex flex-col gap-4">
                {history.map((b) => (
                  <PatientVisitCard key={b.id} booking={b} onChanged={refresh} />
                ))}
              </div>
            ) : (
              <SectionEmpty>Brak wcześniejszych wizyt w historii.</SectionEmpty>
            )}
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
