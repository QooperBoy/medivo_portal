'use client';

/**
 * (patient) /konto/powiadomienia — preferencje powiadomień pacjenta (B10).
 *
 * Źródło danych: GET /api/patients/notification-prefs?email= (silnik G1).
 * Zmiana przełącznika zapisuje się optymistycznie przez PUT (patch pojedynczego
 * kanału) i zwraca pełny stan preferencji; przy błędzie stan wraca do
 * poprzedniego. Opt-out jest respektowany przez silnik powiadomień (G1) —
 * wyłączony kanał nie jest używany do wysyłek.
 *
 * A11y: przełączniki jako role="switch" (aria-checked, aria-labelledby/
 * describedby, obsługa klawiatury, tap ≥44px); status zapisu w regionie
 * aria-live. Guard i nawigacja konta pochodzą z layoutu grupy (patient) — tutaj
 * renderujemy wyłącznie treść.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiClient } from '@/lib/api-client';
import type { NotificationPrefs, UpdateNotificationPrefsBody } from '@/domain';
import { Card, CardContent } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { Leaf } from '@/components/doodles';
import { cn } from '@/lib/utils';

/** Ścieżka endpointu preferencji powiadomień (GET/PUT, silnik G1). */
const PREFS_PATH = '/api/patients/notification-prefs';

/** Opis pojedynczego przełącznika preferencji. */
interface PrefRow {
  key: keyof NotificationPrefs;
  title: string;
  desc: string;
}

const PREF_ROWS: readonly PrefRow[] = [
  {
    key: 'email',
    title: 'E-mail',
    desc: 'Potwierdzenia rezerwacji i informacje o zmianach terminów na Twój adres e-mail.',
  },
  {
    key: 'sms',
    title: 'SMS',
    desc: 'Krótkie powiadomienia SMS o statusie wizyt.',
  },
  {
    key: 'reminders',
    title: 'Przypomnienia o wizytach',
    desc: 'Przypomnienie na dobę przed wizytą (T−24 h, silnik G2).',
  },
  {
    key: 'marketing',
    title: 'Materiały marketingowe',
    desc: 'Informacje o nowościach i wskazówki. Domyślnie wyłączone — zgoda jest dobrowolna.',
  },
];

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; prefs: NotificationPrefs };

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/* ------------------------------------------------------------------ *
 * Dostępny przełącznik (role="switch"), tap ≥44px
 * ------------------------------------------------------------------ */

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelledBy: string;
  describedBy: string;
}

function Toggle({ checked, onChange, labelledBy, describedBy }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-11 w-[68px] shrink-0 cursor-pointer items-center rounded-full px-1 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        checked ? 'bg-brand-600' : 'bg-slate-300',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-9 w-9 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-0',
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Strona
 * ------------------------------------------------------------------ */

export default function PowiadomieniaPage() {
  const { user } = useAuth();
  // Guard i nawigacja są w layoucie grupy (patient); tu user jest pacjentem.
  if (!user) return null;
  return <NotificationPrefsSection email={user.email} />;
}

function NotificationPrefsSection({ email }: { email: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [save, setSave] = useState<SaveState>('idle');
  /** Sekwencja zapisów — tylko odpowiedź na najnowszy PUT aktualizuje stan. */
  const saveSeq = useRef(0);
  const baseId = useId();

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void (async () => {
      try {
        const res = await apiClient.get<NotificationPrefs>(
          `${PREFS_PATH}?email=${encodeURIComponent(email)}`,
        );
        if (!active) return;
        if (res.status === 200) {
          setState({ status: 'ready', prefs: res.data });
        } else {
          setState({ status: 'error' });
        }
      } catch {
        if (active) setState({ status: 'error' });
      }
    })();
    return () => {
      active = false;
    };
  }, [email, reloadKey]);

  function handleToggle(key: keyof NotificationPrefs, next: boolean) {
    if (state.status !== 'ready') return;
    const prev = state.prefs;

    // Optymistyczna aktualizacja UI.
    const optimistic: NotificationPrefs = { ...prev };
    optimistic[key] = next;
    setState({ status: 'ready', prefs: optimistic });
    setSave('saving');

    const seq = ++saveSeq.current;
    const patch: UpdateNotificationPrefsBody = {};
    patch[key] = next;

    void (async () => {
      try {
        const res = await apiClient.request<NotificationPrefs>(
          'PUT',
          `${PREFS_PATH}?email=${encodeURIComponent(email)}`,
          { body: patch },
        );
        if (seq !== saveSeq.current) return; // wynik nieaktualny — pomiń
        if (res.status === 200) {
          setState({ status: 'ready', prefs: res.data });
          setSave('saved');
        } else {
          setState({ status: 'ready', prefs: prev }); // cofnij zmianę
          setSave('error');
        }
      } catch {
        if (seq !== saveSeq.current) return;
        setState({ status: 'ready', prefs: prev });
        setSave('error');
      }
    })();
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5" />
          <h2 className="text-xl font-semibold text-ink">Powiadomienia</h2>
        </div>
        <p className="max-w-2xl text-sm text-ink-muted">
          Wybierz kanały, którymi chcesz otrzymywać informacje o wizytach.
          Wyłączenie kanału (opt-out) jest respektowane przez silnik powiadomień
          (G1) — nie wyślemy nim żadnych wiadomości.
        </p>
        <BeBadge
          endpoint="GET · PUT /api/patients/notification-prefs"
          desc="Preferencje powiadomień pacjenta (silnik G1). Dane z zamockowanego backendu (MSW)."
          className="self-start"
        />
      </header>

      {state.status === 'loading' && <PrefsSkeleton />}

      {state.status === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-xl2 border border-danger-200 bg-danger-50 p-8 text-center"
        >
          <p className="text-sm text-danger-700">
            Nie udało się wczytać preferencji powiadomień.
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex h-11 items-center justify-center rounded-xl2 border border-brand-600 bg-white px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <Card>
          <CardContent className="flex flex-col gap-1">
            <ul className="flex flex-col divide-y divide-slate-200/70">
              {PREF_ROWS.map((row) => {
                const labelId = `${baseId}-${row.key}-label`;
                const descId = `${baseId}-${row.key}-desc`;
                return (
                  <li
                    key={row.key}
                    className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span id={labelId} className="text-sm font-medium text-ink">
                        {row.title}
                      </span>
                      <span id={descId} className="max-w-md text-sm text-ink-muted">
                        {row.desc}
                      </span>
                    </div>
                    <Toggle
                      checked={state.prefs[row.key]}
                      onChange={(next) => handleToggle(row.key, next)}
                      labelledBy={labelId}
                      describedBy={descId}
                    />
                  </li>
                );
              })}
            </ul>

            <p
              role="status"
              aria-live="polite"
              className={cn(
                'mt-4 text-sm',
                save === 'error' ? 'text-danger-700' : 'text-ink-subtle',
              )}
            >
              {save === 'saving' && 'Zapisywanie…'}
              {save === 'saved' && 'Zapisano zmiany.'}
              {save === 'error' && 'Nie udało się zapisać zmiany. Spróbuj ponownie.'}
              {save === 'idle' && 'Zmiany zapisują się automatycznie.'}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function PrefsSkeleton() {
  return (
    <div role="status" className="rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card">
      <span className="sr-only">Wczytuję preferencje powiadomień…</span>
      <div className="flex flex-col divide-y divide-slate-200/70">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            aria-hidden="true"
            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="flex flex-col gap-2">
              <div className="h-4 w-40 animate-pulse rounded bg-surface-subtle" />
              <div className="h-3 w-64 animate-pulse rounded bg-surface-subtle" />
            </div>
            <div className="h-11 w-[68px] animate-pulse rounded-full bg-surface-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}
