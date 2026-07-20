'use client';

/**
 * (admin) /admin/audyt — Dziennik audytu (F10).
 *
 * Tabela operacji administracyjnych/systemowych (logowania, moderacje, blokady,
 * operacje RODO). Najnowsze u góry. Prosty filtr tekstowy po akcji i aktorze.
 * Audyt to zapis operacji na danych — służy kontroli i rozliczalności (RODO;
 * G11/F10). Obsługa stanów: loading / error / empty. Dane z mocka (MSW).
 */

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { AuditResponse, AuditEntry } from '@/domain';
import { Button } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { EmptyResults } from '@/components/illustrations';

type ListStatus = 'loading' | 'ready' | 'error';

/** Znacznik zdarzenia — data i godzina, strefa Europe/Warsaw. */
const atFmt = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatAt(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? '—' : atFmt.format(ms);
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl2 border border-slate-200/70 bg-white p-4 shadow-card"
        >
          <div className="h-3 w-32 animate-pulse rounded bg-surface-subtle" />
          <div className="h-3 w-40 animate-pulse rounded bg-surface-subtle" />
          <div className="h-3 w-36 animate-pulse rounded bg-surface-subtle" />
          <div className="h-3 flex-1 animate-pulse rounded bg-surface-subtle" />
        </div>
      ))}
    </div>
  );
}

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditEntry[] | null>(null);
  const [status, setStatus] = useState<ListStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    void (async () => {
      try {
        const res = await apiClient.get<AuditResponse>('/api/admin/audit');
        if (cancelled) return;
        if (res.status >= 400) {
          setStatus('error');
          return;
        }
        setItems(res.data.items);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Najnowsze u góry — sortowanie defensywne (API już sortuje malejąco po `at`).
  const sorted = useMemo(
    () =>
      [...(items ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    [items],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (normalizedQuery.length === 0) return sorted;
    return sorted.filter(
      (e) =>
        e.action.toLowerCase().includes(normalizedQuery) ||
        e.actor.toLowerCase().includes(normalizedQuery),
    );
  }, [sorted, normalizedQuery]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Dziennik audytu · F10
          </span>
          <BeBadge
            endpoint="GET /api/admin/audit"
            desc="Zapis operacji administracyjnych i systemowych"
          />
        </div>
        <h2 className="text-xl font-semibold text-ink">Audyt</h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          Dziennik audytu to zapis operacji na danych — logowań, moderacji,
          blokad kont i operacji RODO. Służy kontroli i rozliczalności zgodnie
          z RODO (G11/F10). Wpisów nie można edytować ani usuwać.
        </p>
      </header>

      {/* Filtr tekstowy po akcji / aktorze */}
      <div className="flex flex-col gap-1">
        <label htmlFor="audit-filter" className="sr-only">
          Filtruj po akcji lub aktorze
        </label>
        <div className="relative max-w-sm">
          <input
            id="audit-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtruj po akcji lub aktorze…"
            autoComplete="off"
            className="h-11 w-full rounded-xl2 border border-slate-200 bg-surface-muted px-4 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          />
        </div>
      </div>

      {status === 'loading' && <TableSkeleton />}

      {status === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-5"
        >
          <p className="text-sm font-medium text-danger-700">
            Nie udało się wczytać dziennika audytu z zamockowanego backendu.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {status === 'ready' &&
        (sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-slate-200 bg-surface-muted px-6 py-12 text-center">
            <EmptyResults className="h-32 w-40" />
            <p className="text-base font-semibold text-ink">
              Dziennik jest pusty
            </p>
            <p className="max-w-sm text-sm text-ink-muted">
              Operacje administracyjne i systemowe pojawią się tutaj w kolejności
              od najnowszych.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl2 border border-dashed border-slate-200 bg-surface-muted px-6 py-8">
            <p className="text-sm text-ink-muted">
              Brak wpisów pasujących do filtra „{query.trim()}”.
            </p>
            <Button type="button" variant="ghost" onClick={() => setQuery('')}>
              Wyczyść filtr
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p role="status" className="text-xs font-medium text-ink-subtle">
              {filtered.length}{' '}
              {filtered.length === 1 ? 'wpis' : 'wpisów'} w dzienniku
            </p>
            <div className="overflow-x-auto rounded-xl2 border border-slate-200/70 bg-white shadow-card">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <caption className="sr-only">
                  Dziennik audytu — data, aktor, akcja, cel i dodatkowy kontekst,
                  od najnowszych.
                </caption>
                <thead>
                  <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-ink-subtle">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Data
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Aktor
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Akcja
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Cel
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Kontekst
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 align-top last:border-0"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                        {formatAt(entry.at)}
                      </td>
                      <td className="px-4 py-3 text-ink">{entry.actor}</td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-surface-subtle px-1.5 py-0.5 text-xs font-medium text-ink">
                          {entry.action}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{entry.target}</td>
                      <td className="px-4 py-3 text-ink-subtle">
                        {entry.meta ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
