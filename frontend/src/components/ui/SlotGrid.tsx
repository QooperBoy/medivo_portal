'use client';

import { cn } from '@/lib/utils';
import type { Slot } from '@/domain';

export interface SlotGridProps {
  slots: Slot[];
  /** Wywoływane po kliknięciu wolnego slotu. */
  onSelect?: (slot: Slot) => void;
  className?: string;
}

// Formatery tworzone raz; stała strefa czasu => spójny SSR/CSR (brak rozjazdu hydracji).
const TZ = 'Europe/Warsaw';
const dayHeaderFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
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

interface DayGroup {
  key: string;
  header: string;
  slots: Slot[];
}

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

function modeLabel(mode: Slot['mode']): string {
  return mode === 'online' ? 'online' : 'stacjonarnie';
}

function statusLabel(status: Slot['status']): string {
  switch (status) {
    case 'booked':
      return 'zajęty';
    case 'locked':
      return 'chwilowo zablokowany';
    case 'blocked':
      return 'niedostępny';
    default:
      return 'wolny';
  }
}

function SlotButton({
  slot,
  onSelect,
}: {
  slot: Slot;
  onSelect?: (slot: Slot) => void;
}) {
  const available = slot.status === 'available';
  const time = timeFmt.format(new Date(slot.startsAt));
  const ariaLabel = `${time}, ${modeLabel(slot.mode)}${available ? '' : `, ${statusLabel(slot.status)}`}`;

  return (
    <button
      type="button"
      disabled={!available}
      onClick={available && onSelect ? () => onSelect(slot) : undefined}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex min-h-[44px] flex-col items-center justify-center rounded-xl2 border px-3 py-1.5 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
        available
          ? 'cursor-pointer border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-300 hover:bg-brand-100'
          : 'cursor-not-allowed border-slate-200 bg-surface-subtle text-ink-subtle opacity-70',
      )}
    >
      <span className="font-semibold tabular-nums">{time}</span>
      <span className="text-[11px] leading-tight">{modeLabel(slot.mode)}</span>
    </button>
  );
}

/**
 * Siatka terminów pogrupowanych po dniach (nagłówki PL). Wolne sloty są
 * klikalne; zajęte/zablokowane — wyszarzone i disabled.
 */
export function SlotGrid({ slots, onSelect, className }: SlotGridProps) {
  if (slots.length === 0) {
    return (
      <p className={cn('text-sm text-ink-subtle', className)}>
        Brak wolnych terminów w wybranym zakresie.
      </p>
    );
  }

  const groups = groupByDay(slots);

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold capitalize text-ink">
            {group.header}
          </h4>
          <div className="flex flex-wrap gap-2">
            {group.slots.map((slot) => (
              <SlotButton key={slot.id} slot={slot} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
