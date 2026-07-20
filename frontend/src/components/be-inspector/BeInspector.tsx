'use client';

import { useEffect, useRef, useState } from 'react';
import { useBeInspector } from '@/lib/use-be-inspector';
import { beInspector, type BeLogEntry } from '@/lib/be-inspector';
import { cn } from '@/lib/utils';

const timeFmt = new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function phaseBadgeClasses(phase: BeLogEntry['phase']): string {
  switch (phase) {
    case 'pending':
      return 'bg-warning-100 text-warning-700';
    case 'error':
      return 'bg-danger-100 text-danger-700';
    default:
      return 'bg-brand-100 text-brand-800';
  }
}

function statusText(entry: BeLogEntry): string {
  if (entry.phase === 'pending') return '…';
  return entry.status != null ? String(entry.status) : '—';
}

function pretty(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function hasContent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

function DetailBlock({ label, value }: { label: string; value: unknown }) {
  if (!hasContent(value)) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <pre className="max-h-48 overflow-auto rounded-lg bg-surface-subtle p-2 text-[11px] leading-relaxed text-ink">
        {pretty(value)}
      </pre>
    </div>
  );
}

function EntryRow({ entry }: { entry: BeLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-xl2 border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-2 rounded-xl2 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <div className="flex items-center gap-2">
          <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
            {entry.method}
          </span>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold',
              phaseBadgeClasses(entry.phase),
            )}
          >
            {statusText(entry)}
          </span>
          <span className="ml-auto text-[11px] tabular-nums text-ink-subtle">
            {entry.latencyMs != null ? `${entry.latencyMs} ms` : '…'}
          </span>
        </div>

        <span className="break-all font-mono text-xs text-ink-muted">
          {entry.url}
        </span>

        {(entry.engine || entry.stateTransition) && (
          <div className="flex flex-wrap gap-1.5">
            {entry.engine && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-300 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">
                x-engine: {entry.engine}
              </span>
            )}
            {entry.stateTransition && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-800 px-2 py-0.5 text-[11px] font-semibold text-white">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                {entry.stateTransition}
              </span>
            )}
          </div>
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-slate-100 p-3">
          <span className="text-[11px] text-ink-subtle">
            {timeFmt.format(new Date(entry.ts))}
          </span>
          <DetailBlock label="Nagłówki żądania" value={entry.requestHeaders} />
          <DetailBlock label="Body żądania" value={entry.requestBody} />
          <DetailBlock label="Nagłówki odpowiedzi" value={entry.responseHeaders} />
          <DetailBlock label="Body odpowiedzi" value={entry.responseBody} />
        </div>
      )}
    </li>
  );
}

/**
 * Wysuwany panel logujący każde żądanie do (zamockowanego) backendu. Uchwyt w
 * prawym dolnym rogu jest zawsze widoczny (z licznikiem i pulsem przy nowym
 * wpisie); panel to nakładka — nie blokuje interakcji z resztą strony.
 */
export function BeInspector() {
  const entries = useBeInspector();
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const prevCount = useRef(0);
  const autoOpened = useRef(false);

  // Auto-otwarcie przy pierwszym w ogóle wpisie.
  useEffect(() => {
    if (!autoOpened.current && entries.length > 0) {
      autoOpened.current = true;
      setOpen(true);
    }
  }, [entries.length]);

  // Puls, gdy pojawia się nowy wpis przy zamkniętym panelu.
  useEffect(() => {
    if (entries.length > prevCount.current && !open) {
      setHasNew(true);
    }
    prevCount.current = entries.length;
  }, [entries.length, open]);

  // Otwarcie panelu kasuje sygnał „nowe".
  useEffect(() => {
    if (open) setHasNew(false);
  }, [open]);

  return (
    <>
      {/* Uchwyt — zawsze widoczny */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={
          open
            ? 'Zamknij panel BE Inspector'
            : `Otwórz panel BE Inspector${entries.length ? `, zalogowanych żądań: ${entries.length}` : ''}`
        }
        className="fixed bottom-5 right-5 z-[60] inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
        <span>BE Inspector</span>
        {entries.length > 0 && (
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs tabular-nums">
            {entries.length}
          </span>
        )}
        {hasNew && !open && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-danger-500 ring-2 ring-white" />
          </span>
        )}
      </button>

      {/* Nakładka: overflow-hidden chowa panel poza ekranem, pointer-events-none
          przepuszcza kliknięcia do strony (panel odzyskuje je przez pointer-events-auto). */}
      <div
        className="pointer-events-none fixed inset-0 z-[55] overflow-hidden"
        aria-hidden={!open}
      >
        <aside
          role="region"
          aria-label="BE Inspector — log żądań do zamockowanego backendu"
          className={cn(
            'pointer-events-auto absolute right-0 top-0 flex h-full w-full max-w-md transform flex-col bg-surface-muted shadow-2xl transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
            <h2 className="text-sm font-bold text-ink">BE Inspector</h2>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
              {entries.length} żądań
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => beInspector.clear()}
                className="rounded-lg px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                Wyczyść
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zamknij panel"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-3">
            {entries.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <p className="text-sm font-medium text-ink">Brak żądań</p>
                <p className="text-xs text-ink-subtle">
                  Kliknij „Testuj mock”, aby zobaczyć zalogowane żądanie do
                  zamockowanego backendu.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
