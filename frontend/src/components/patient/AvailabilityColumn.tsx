'use client';

/**
 * AvailabilityColumn — środkowa kolumna karty wyniku (A3): najbliższe wolne
 * terminy pogrupowane po dniach, prezentowane INLINE. Każdy termin to „pigułka"
 * będąca linkiem-skrótem do rezerwacji: `/profil/{slug}?slot={slot.id}`
 * (profil auto-otwiera BookingDialog dla tego slotu — ścieżka A5).
 *
 * Domyślnie pokazujemy najbliższe ~2 dni; resztę odsłania przycisk
 * „Pokaż więcej terminów" (przełącznik), a po rozwinięciu lista trafia do
 * przewijanego kontenera (max-h + overflow-y-auto) — wszystkie terminy są
 * osiągalne. Daty/godziny formatowane w strefie Europe/Warsaw (spójny SSR/CSR).
 */
import { useState } from 'react';
import Link from 'next/link';
import type { Slot, SlotMode } from '@/domain';
import { EmptySlots } from '@/components/illustrations';
import { cn } from '@/lib/utils';

export interface AvailabilityColumnProps {
  /** Slug specjalisty — do zbudowania linku-skrótu rezerwacji. */
  slug: string;
  /** Najbliższe wolne terminy (posortowane rosnąco na wejściu). */
  slots: Slot[];
}

/** Liczba dni pokazywanych domyślnie (przed „Pokaż więcej"). */
const INITIAL_DAYS = 2;

// Formatery tworzone raz; stała strefa => spójny SSR/CSR (brak rozjazdu hydracji).
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
/** Pełny opis dnia dla aria-label, np. „poniedziałek 21 lipca". */
const ariaDayFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
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

function modeLabel(mode: SlotMode): string {
  return mode === 'online' ? 'online' : 'stacjonarnie';
}

/** Ikona trybu terminu (dekoracyjna). */
function ModeIcon({ mode }: { mode: SlotMode }) {
  if (mode === 'online') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 shrink-0 text-brand-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 text-brand-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
      <path d="M15 9h3a2 2 0 0 1 2 2v10" />
      <path d="M3 21h18M8 8h2M8 12h2M8 16h2" />
    </svg>
  );
}

/** Pojedyncza „pigułka" terminu — link-skrót do rezerwacji (A5). */
function SlotPill({ slug, slot }: { slug: string; slot: Slot }) {
  const date = new Date(slot.startsAt);
  const time = timeFmt.format(date);
  const ariaLabel = `${ariaDayFmt.format(date)}, ${time}, ${modeLabel(slot.mode)}`;

  return (
    <Link
      href={`/profil/${slug}?slot=${slot.id}`}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl2 border px-3 py-1.5 text-sm transition-colors',
        'border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-300 hover:bg-brand-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
      )}
    >
      <ModeIcon mode={slot.mode} />
      <span className="font-semibold tabular-nums">{time}</span>
    </Link>
  );
}

function DayBlock({ slug, group }: { slug: string; group: DayGroup }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold capitalize text-ink-muted">{group.header}</h4>
      <div className="flex flex-wrap gap-2">
        {group.slots.map((slot) => (
          <SlotPill key={slot.id} slug={slug} slot={slot} />
        ))}
      </div>
    </div>
  );
}

export function AvailabilityColumn({ slug, slots }: AvailabilityColumnProps) {
  const [expanded, setExpanded] = useState(false);

  // Pusto — lekka ścieżka do profilu (A8).
  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl2 border border-dashed border-slate-200 bg-surface-muted/60 px-4 py-6 text-center">
        <EmptySlots className="h-16 w-16" />
        <p className="text-sm font-medium text-ink-muted">Brak wolnych terminów</p>
        <Link
          href={`/profil/${slug}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl2 border border-brand-200 bg-white px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          Zobacz profil
        </Link>
      </div>
    );
  }

  const groups = groupByDay(slots);
  const hasMore = groups.length > INITIAL_DAYS;
  const visibleGroups = expanded ? groups : groups.slice(0, INITIAL_DAYS);
  const hiddenSlotCount = groups
    .slice(INITIAL_DAYS)
    .reduce((sum, group) => sum + group.slots.length, 0);

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          'flex flex-col gap-3',
          expanded && 'max-h-72 overflow-y-auto pr-1',
        )}
      >
        {visibleGroups.map((group) => (
          <DayBlock key={group.key} slug={slug} group={group} />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1 rounded-xl2 border border-brand-200 bg-white px-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          {expanded ? 'Pokaż mniej' : `Pokaż więcej terminów (+${hiddenSlotCount})`}
        </button>
      )}
    </div>
  );
}
