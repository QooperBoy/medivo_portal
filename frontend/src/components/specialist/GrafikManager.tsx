'use client';

/**
 * GrafikManager (E2) — grafik/dostępność specjalisty na zamockowanym backendzie.
 *
 * Pobiera WSZYSTKIE sloty (z `includeBlocked=true`, silnik G5-slot-lock),
 * grupuje po dniach (strefa Europe/Warsaw) i pozwala:
 *  - zablokować wolny termin (POST /api/slots/:id/block, E2-availability),
 *  - odblokować zablokowany (POST /api/slots/:id/unblock),
 *  - dodać nowy termin (AddSlotForm).
 * Terminy `booked`/`locked` są tylko do odczytu. Po każdej mutacji następuje
 * ciche odświeżenie listy; spinner pokazywany jest na konkretnym przycisku.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Slot, SlotMode, SlotStatus, SlotsListResponse } from '@/domain';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui';
import { EmptySlots } from '@/components/illustrations';
import { cn } from '@/lib/utils';
import { AddSlotForm } from './AddSlotForm';

export interface GrafikManagerProps {
  specialistId: string;
}

const TZ = 'Europe/Warsaw';
const dayHeaderFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TZ,
});
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TZ,
});
const timeFmt = new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

const SLOT_MODE_LABEL: Record<SlotMode, string> = {
  online: 'online',
  stacjonarnie: 'stacjonarnie',
};

interface StatusMeta {
  label: string;
  badge: string;
  dimmed: boolean;
}

const STATUS_META: Record<SlotStatus, StatusMeta> = {
  available: {
    label: 'Wolny',
    badge: 'border-brand-200 bg-brand-50 text-brand-800',
    dimmed: false,
  },
  blocked: {
    label: 'Zablokowany',
    badge: 'border-slate-200 bg-surface-subtle text-ink-subtle',
    dimmed: true,
  },
  booked: {
    label: 'Zajęty',
    badge: 'border-warning-200 bg-warning-100 text-warning-700',
    dimmed: false,
  },
  locked: {
    label: 'Chwilowo zablokowany',
    badge: 'border-warning-200 bg-warning-50 text-warning-700',
    dimmed: false,
  },
};

interface DayGroup {
  key: string;
  header: string;
  slots: Slot[];
}

/** Grupuje sloty po dniu (Europe/Warsaw), sortując rosnąco po czasie startu. */
function groupByDay(slots: Slot[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  const sorted = [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  for (const slot of sorted) {
    const date = new Date(slot.startsAt);
    const key = dayKeyFmt.format(date);
    let group = groups.get(key);
    if (!group) {
      group = { key, header: dayHeaderFmt.format(date), slots: [] };
      groups.set(key, group);
    }
    group.slots.push(slot);
  }

  return [...groups.values()];
}

type FetchState =
  | { status: 'loading' }
  | { status: 'success'; slots: Slot[]; engine: string | null }
  | { status: 'error'; message: string };

export function GrafikManager({ specialistId }: GrafikManagerProps) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setState({ status: 'loading' });
      try {
        const res = await apiClient.get<SlotsListResponse>(
          `/api/specialists/${specialistId}/slots?includeBlocked=true`,
        );
        if (res.status >= 400) {
          setState({
            status: 'error',
            message: `Nie udało się pobrać grafiku (kod ${res.status}).`,
          });
          return;
        }
        setState({
          status: 'success',
          slots: res.data.items,
          engine: res.engine,
        });
      } catch {
        setState({
          status: 'error',
          message: 'Nie udało się połączyć z zamockowanym backendem.',
        });
      }
    },
    [specialistId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const runSlotAction = useCallback(
    async (slot: Slot, action: 'block' | 'unblock') => {
      setPendingSlotId(slot.id);
      setActionError(null);
      try {
        const res = await apiClient.post<Slot>(`/api/slots/${slot.id}/${action}`);
        if (res.status === 409) {
          setActionError(
            'Nie można zablokować terminu — jest już zajęty lub chwilowo zarezerwowany.',
          );
        } else if (res.status >= 400) {
          setActionError(
            action === 'block'
              ? 'Nie udało się zablokować terminu. Spróbuj ponownie.'
              : 'Nie udało się odblokować terminu. Spróbuj ponownie.',
          );
        } else {
          await load({ silent: true });
        }
      } catch {
        setActionError(
          'Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.',
        );
      } finally {
        setPendingSlotId(null);
      }
    },
    [load],
  );

  const actionPending = pendingSlotId !== null;

  return (
    <div className="flex flex-col gap-6">
      <AddSlotForm
        specialistId={specialistId}
        onAdded={() => void load({ silent: true })}
      />

      {actionError && (
        <p
          role="alert"
          className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          {actionError}
        </p>
      )}

      {state.status === 'loading' && <GrafikSkeleton />}

      {state.status === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-xl2 border border-danger-200 bg-danger-50 p-8 text-center"
        >
          <p className="text-sm text-danger-700">{state.message}</p>
          <Button variant="outline" onClick={() => void load()}>
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {state.status === 'success' && state.slots.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl2 border border-slate-200/70 bg-white p-10 text-center shadow-card">
          <EmptySlots className="h-32 w-32" />
          <div className="flex flex-col gap-1">
            <h2 role="status" className="text-lg font-semibold text-ink">
              Brak terminów w grafiku
            </h2>
            <p className="text-sm text-ink-muted">
              Brak terminów w grafiku — dodaj pierwszy powyżej.
            </p>
          </div>
        </div>
      )}

      {state.status === 'success' && state.slots.length > 0 && (
        <section aria-label="Terminy w grafiku" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Twoje terminy</h2>
            {state.engine && (
              <span className="text-xs text-ink-subtle">
                obsłużone przez: {state.engine}
              </span>
            )}
          </div>

          {groupByDay(state.slots).map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold capitalize text-ink">
                {group.header}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.slots.map((slot) => (
                  <li key={slot.id}>
                    <SlotTile
                      slot={slot}
                      pending={pendingSlotId === slot.id}
                      disabled={actionPending && pendingSlotId !== slot.id}
                      onBlock={() => void runSlotAction(slot, 'block')}
                      onUnblock={() => void runSlotAction(slot, 'unblock')}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

interface SlotTileProps {
  slot: Slot;
  pending: boolean;
  disabled: boolean;
  onBlock: () => void;
  onUnblock: () => void;
}

function SlotTile({ slot, pending, disabled, onBlock, onUnblock }: SlotTileProps) {
  const meta = STATUS_META[slot.status];
  const timeRange = `${timeFmt.format(new Date(slot.startsAt))}–${timeFmt.format(
    new Date(slot.endsAt),
  )}`;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl2 border border-slate-200/70 bg-white p-4 shadow-card',
        meta.dimmed && 'bg-surface-muted',
      )}
    >
      <div className="flex min-w-[7rem] flex-col">
        <span
          className={cn(
            'text-base font-semibold tabular-nums text-ink',
            meta.dimmed && 'text-ink-subtle line-through',
          )}
        >
          {timeRange}
        </span>
        <span className="text-xs text-ink-subtle">
          {SLOT_MODE_LABEL[slot.mode]}
        </span>
      </div>

      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
          meta.badge,
        )}
      >
        {meta.label}
      </span>

      <div className="ml-auto">
        {slot.status === 'available' && (
          <Button
            variant="outline"
            size="md"
            loading={pending}
            disabled={disabled}
            onClick={onBlock}
            aria-label={`Zablokuj termin ${timeRange}`}
          >
            Zablokuj
          </Button>
        )}
        {slot.status === 'blocked' && (
          <Button
            variant="secondary"
            size="md"
            loading={pending}
            disabled={disabled}
            onClick={onUnblock}
            aria-label={`Odblokuj termin ${timeRange}`}
          >
            Odblokuj
          </Button>
        )}
      </div>
    </div>
  );
}

function GrafikSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Wczytuję grafik…</span>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-16 animate-pulse rounded-xl2 bg-surface-subtle"
        />
      ))}
    </div>
  );
}
