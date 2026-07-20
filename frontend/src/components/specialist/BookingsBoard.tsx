'use client';

/**
 * BookingsBoard — lista rezerwacji panelu dla jednego zakresu (E4). Pobiera
 * `GET /api/specialists/:id/bookings?scope=<scope>` (odczyt oznaczony
 * `x-engine: G7-scoring`) i renderuje karty `BookingCard`. Obsługuje stany:
 * loading (skeleton) / error (retry) / empty (EmptyResults) / success. Po akcji
 * na karcie robi refetch (bump `reloadKey`) i przez czas odświeżania trzyma
 * poprzednią listę, żeby uniknąć migotania.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type {
  BookingListItem,
  BookingScope,
  SpecialistBookingsResponse,
} from '@/domain';
import { Button } from '@/components/ui';
import { EmptyResults } from '@/components/illustrations';
import { BookingCard } from './BookingCard';

export interface BookingsBoardProps {
  specialistId: string;
  scope: BookingScope;
}

type BoardStatus = 'loading' | 'refreshing' | 'ready' | 'error';

/** Kopie pustego stanu zależne od zakresu. */
const EMPTY_COPY: Record<BookingScope, { title: string; body: string }> = {
  pending: {
    title: 'Brak próśb o akceptację',
    body: 'Nowe rezerwacje wymagające decyzji pojawią się w tym miejscu.',
  },
  upcoming: {
    title: 'Brak nadchodzących wizyt',
    body: 'Potwierdzone wizyty zaplanowane w przyszłości zobaczysz tutaj.',
  },
  past: {
    title: 'Nic do potwierdzenia',
    body: 'Wizyty po terminie oczekujące na oznaczenie „odbyła się” lub nieobecności pojawią się tutaj.',
  },
  history: {
    title: 'Historia jest pusta',
    body: 'Zakończone, odwołane oraz nieodbyte wizyty trafiają do historii.',
  },
  all: {
    title: 'Brak rezerwacji',
    body: 'Nie ma jeszcze żadnych rezerwacji do wyświetlenia.',
  },
};

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-44 animate-pulse rounded bg-surface-subtle" />
              <div className="h-3 w-32 animate-pulse rounded bg-surface-subtle" />
            </div>
            <div className="h-6 w-28 animate-pulse rounded-full bg-surface-subtle" />
          </div>
          <div className="h-16 w-full animate-pulse rounded-xl2 bg-surface-subtle" />
          <div className="flex gap-2">
            <div className="h-11 w-28 animate-pulse rounded-xl2 bg-surface-subtle" />
            <div className="h-11 w-28 animate-pulse rounded-xl2 bg-surface-subtle" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BoardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-5"
    >
      <p className="text-sm font-medium text-danger-700">
        Nie udało się wczytać rezerwacji z zamockowanego backendu.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}

export function BookingsBoard({ specialistId, scope }: BookingsBoardProps) {
  const [items, setItems] = useState<BookingListItem[] | null>(null);
  const [status, setStatus] = useState<BoardStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const hasDataRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setStatus(hasDataRef.current ? 'refreshing' : 'loading');

    void (async () => {
      try {
        const res = await apiClient.get<SpecialistBookingsResponse>(
          `/api/specialists/${specialistId}/bookings?scope=${scope}`,
        );
        if (cancelled) return;
        if (res.status >= 400) {
          setStatus('error');
          return;
        }
        setItems(res.data.items);
        hasDataRef.current = true;
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [specialistId, scope, reloadKey]);

  const onChanged = useCallback(() => setReloadKey((key) => key + 1), []);

  if (status === 'loading') return <BoardSkeleton />;
  if (status === 'error') return <BoardError onRetry={onChanged} />;

  const list = items ?? [];

  if (list.length === 0) {
    const copy = EMPTY_COPY[scope];
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-slate-200 bg-surface-muted px-6 py-12 text-center">
        <EmptyResults className="h-32 w-40" />
        <p className="text-base font-semibold text-ink">{copy.title}</p>
        <p className="max-w-sm text-sm text-ink-muted">{copy.body}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {status === 'refreshing' && (
        <p role="status" className="text-xs font-medium text-ink-subtle">
          Odświeżanie listy…
        </p>
      )}
      {list.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          scope={scope}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}
