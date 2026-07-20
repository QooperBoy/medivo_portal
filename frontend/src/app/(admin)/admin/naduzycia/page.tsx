'use client';

/**
 * (admin) /admin/naduzycia — Zgłoszenia nadużyć (F4).
 *
 * Lista sygnałów z automatycznego wykrywania nadużyć (G8) — np. multikonto czy
 * nietypowa seria rezerwacji. Zgłoszenie `open` wymaga decyzji: oznaczenia jako
 * sprawdzone (reviewed) lub odrzucenia (dismissed) przez `resolve`. Po akcji
 * lista jest odświeżana. Stany: loading / error / empty. Dane z mocka (MSW).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type {
  AbuseFlagsResponse,
  AbuseFlag,
  AbuseSeverity,
  AbuseStatus,
} from '@/domain';
import { Button, Chip } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { EmptyResults } from '@/components/illustrations';
import { Sparkle } from '@/components/doodles';

type ListStatus = 'loading' | 'refreshing' | 'ready' | 'error';
type ResolveStatus = Extract<AbuseStatus, 'reviewed' | 'dismissed'>;

interface PendingResolve {
  id: string;
  status: ResolveStatus;
}

/** Znacznik utworzenia zgłoszenia — data i godzina, strefa Europe/Warsaw. */
const createdFmt = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatCreated(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? '—' : createdFmt.format(ms);
}

const SEVERITY_CHIP: Record<AbuseSeverity, { label: string; className: string }> = {
  low: { label: 'Niska', className: 'bg-surface-subtle text-ink-muted' },
  medium: { label: 'Średnia', className: 'bg-warning-100 text-warning-700' },
  high: { label: 'Wysoka', className: 'bg-danger-100 text-danger-700' },
};

const STATUS_CHIP: Record<AbuseStatus, { label: string; className: string }> = {
  open: { label: 'Otwarte', className: 'bg-brand-50 text-brand-800' },
  reviewed: { label: 'Sprawdzone', className: 'bg-success-100 text-success-700' },
  dismissed: { label: 'Odrzucone', className: 'bg-surface-subtle text-ink-muted' },
};

const SUBJECT_LABEL: Record<AbuseFlag['subjectType'], string> = {
  patient: 'Pacjent',
  specialist: 'Specjalista',
};

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card"
        >
          <div className="flex gap-2">
            <div className="h-6 w-24 animate-pulse rounded-full bg-surface-subtle" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-surface-subtle" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-surface-subtle" />
          </div>
          <div className="h-4 w-3/4 animate-pulse rounded bg-surface-subtle" />
          <div className="flex gap-2">
            <div className="h-11 w-44 animate-pulse rounded-xl2 bg-surface-subtle" />
            <div className="h-11 w-28 animate-pulse rounded-xl2 bg-surface-subtle" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAbusePage() {
  const [items, setItems] = useState<AbuseFlag[] | null>(null);
  const [status, setStatus] = useState<ListStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, setPending] = useState<PendingResolve | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setStatus(hasDataRef.current ? 'refreshing' : 'loading');

    void (async () => {
      try {
        const res =
          await apiClient.get<AbuseFlagsResponse>('/api/admin/abuse-flags');
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
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  async function resolveFlag(id: string, next: ResolveStatus) {
    setPending({ id, status: next });
    setActionError(null);
    try {
      const res = await apiClient.post<AbuseFlag>(
        `/api/admin/abuse-flags/${id}/resolve`,
        { status: next },
      );
      if (res.status >= 400) {
        setActionError(
          res.status === 404
            ? 'Nie znaleziono zgłoszenia — mogło zostać rozstrzygnięte.'
            : 'Nie udało się rozstrzygnąć zgłoszenia. Spróbuj ponownie.',
        );
        setPending(null);
        return;
      }
      setPending(null);
      reload();
    } catch {
      setActionError('Błąd połączenia z zamockowanym backendem.');
      setPending(null);
    }
  }

  const list = items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Nadużycia · F4
          </span>
          <BeBadge
            endpoint="GET /api/admin/abuse-flags"
            desc="Sygnały do przeglądu; akcja POST /resolve"
          />
        </div>
        <h2 className="text-xl font-semibold text-ink">Zgłoszenia nadużyć</h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          Zgłoszenia wymagają decyzji administratora — oznaczenia jako sprawdzone
          albo odrzucenia.
        </p>
      </header>

      {/* Info: fraud detection (G8) */}
      <div className="flex items-start gap-3 rounded-xl2 border border-brand-100 bg-brand-50/60 p-4">
        <Sparkle className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
        <p className="text-sm text-ink-muted">
          Sygnały pochodzą z automatycznego wykrywania nadużyć (G8) — np.
          podejrzenie multikonta lub nietypowa seria rezerwacji. To wskazówki do
          weryfikacji, a nie rozstrzygnięcia — ostateczną decyzję podejmuje
          administrator.
        </p>
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700"
        >
          {actionError}
        </p>
      )}

      {status === 'loading' && <ListSkeleton />}

      {status === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-5"
        >
          <p className="text-sm font-medium text-danger-700">
            Nie udało się wczytać zgłoszeń z zamockowanego backendu.
          </p>
          <Button type="button" variant="outline" onClick={reload}>
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {(status === 'ready' || status === 'refreshing') &&
        (list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-slate-200 bg-surface-muted px-6 py-12 text-center">
            <EmptyResults className="h-32 w-40" />
            <p className="text-base font-semibold text-ink">Brak zgłoszeń</p>
            <p className="max-w-sm text-sm text-ink-muted">
              Nowe sygnały z wykrywania nadużyć pojawią się w tym miejscu.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {status === 'refreshing' && (
              <p role="status" className="text-xs font-medium text-ink-subtle">
                Odświeżanie listy…
              </p>
            )}
            <ul className="flex flex-col gap-3">
              {list.map((flag) => {
                const severity = SEVERITY_CHIP[flag.severity];
                const statusChip = STATUS_CHIP[flag.status];
                const isOpen = flag.status === 'open';
                const rowPending = pending?.id === flag.id;
                return (
                  <li
                    key={flag.id}
                    className="flex flex-col gap-4 rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip className="bg-surface-subtle text-ink-muted">
                        {SUBJECT_LABEL[flag.subjectType]}
                      </Chip>
                      <span className="font-medium text-ink">{flag.subject}</span>
                      <span className="ml-auto flex items-center gap-2">
                        <Chip className={severity.className}>
                          Waga: {severity.label}
                        </Chip>
                        <Chip className={statusChip.className}>
                          {statusChip.label}
                        </Chip>
                      </span>
                    </div>

                    <p className="text-sm text-ink">{flag.reason}</p>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-ink-subtle">
                        Zgłoszono: {formatCreated(flag.createdAt)}
                      </span>
                      {isOpen ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="primary"
                            loading={rowPending && pending?.status === 'reviewed'}
                            disabled={rowPending}
                            onClick={() => resolveFlag(flag.id, 'reviewed')}
                          >
                            Oznacz jako sprawdzone
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            loading={rowPending && pending?.status === 'dismissed'}
                            disabled={rowPending}
                            onClick={() => resolveFlag(flag.id, 'dismissed')}
                          >
                            Odrzuć
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-ink-subtle">
                          Rozstrzygnięto — status „{statusChip.label}”.
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </div>
  );
}
