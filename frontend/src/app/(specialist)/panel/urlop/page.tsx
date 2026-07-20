'use client';

/**
 * (specialist) /panel/urlop — Tryb urlop / choroba (E6).
 *
 * Renderuje wyłącznie treść sekcji (layout panelu dostarcza nagłówek i
 * nawigację). Kontekst „obecnego specjalisty" pochodzi z PanelProvider.
 *
 * Model: włączenie trybu urlop tworzy blok [from, to], który w modelu
 * dostępności (E6→E2) BLOKUJE wolne terminy w tym zakresie — pacjenci ich nie
 * zobaczą. Usunięcie bloku odblokowuje terminy (poza już zajętymi).
 *
 * Endpointy (silnik E6-vacation):
 *  - GET    /api/specialists/:id/vacation
 *  - POST   /api/specialists/:id/vacation      (201; 400 zły zakres)
 *  - DELETE /api/specialists/:id/vacation/:vid ({ ok: true })
 *
 * A11y: etykiety pól, inputy date z min, komunikaty w regionach aria-live,
 * potwierdzenie usunięcia przez dostępny dialog, cele dotykowe ≥44px.
 */

import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type {
  CreateVacationBody,
  VacationBlock,
  VacationResponse,
} from '@/domain';
import { apiClient } from '@/lib/api-client';
import { Button, Card, CardContent } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { CalmScene, EmptyResults } from '@/components/illustrations';
import { ConfirmActionDialog } from '@/components/specialist/ConfirmActionDialog';
import { useCurrentSpecialist } from '@/components/specialist/PanelProvider';

const TZ = 'Europe/Warsaw';

const FIELD_CLASS =
  'h-11 w-full rounded-xl2 border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TZ,
});

/** „Dziś" w strefie Warszawy jako YYYY-MM-DD (min inputów + walidacja). */
function todayInWarsaw(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Zamienia datę z inputa (YYYY-MM-DD) na ISO 8601 (UTC) odpowiadające
 * początkowi (00:00:00) lub końcowi (23:59:59) tego dnia w strefie Europe/Warsaw.
 * Dzięki temu blok obejmuje pełny dzień lokalny, a sformatowany z powrotem w tej
 * samej strefie pokazuje wybraną datę (bez przeskoku o dobę).
 */
function warsawDayToIso(dateYmd: string, endOfDay: boolean): string {
  const [y, mo, d] = dateYmd.split('-').map(Number);
  const h = endOfDay ? 23 : 0;
  const mi = endOfDay ? 59 : 0;
  const s = endOfDay ? 59 : 0;
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(wall));
  const pick = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  let hour = pick('hour');
  if (hour === 24) hour = 0; // en-US może zwrócić „24" o północy
  const zonedAsUtc = Date.UTC(
    pick('year'),
    pick('month') - 1,
    pick('day'),
    hour,
    pick('minute'),
    pick('second'),
  );
  const offset = zonedAsUtc - wall;
  return new Date(wall - offset).toISOString();
}

/** Sformatowany zakres dat bloku (Europe/Warsaw). */
function formatRange(block: VacationBlock): string {
  const from = dateFmt.format(new Date(block.from));
  const to = dateFmt.format(new Date(block.to));
  return from === to ? from : `${from} – ${to}`;
}

export default function UrlopPage() {
  const { specialist, loading, error } = useCurrentSpecialist();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-ink">
              Tryb urlop / choroba
            </h1>
            <p className="max-w-2xl text-sm text-ink-muted">
              Włączenie trybu blokuje całe zakresy dat w modelu dostępności
              (E6→E2). Pacjenci nie zobaczą wolnych terminów z wybranego okresu.
              Zajęte wizyty pozostają bez zmian.
            </p>
          </div>
          <BeBadge
            endpoint="GET · POST · DELETE /api/specialists/:id/vacation"
            desc="Bloki urlopu obsługuje zamockowany backend (MSW): silnik E6-vacation."
            className="self-start"
          />
        </div>
        <CalmScene className="hidden h-24 w-32 shrink-0 sm:block" />
      </header>

      {loading && <VacationSkeleton />}

      {!loading && error && (
        <p
          role="alert"
          className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          {error}
        </p>
      )}

      {!loading && !error && specialist && (
        <VacationManager specialistId={specialist.id} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Manager: lista bloków + formularz włączenia trybu
 * ------------------------------------------------------------------ */

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: VacationBlock[] };

function VacationManager({ specialistId }: { specialistId: string }) {
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [pendingDelete, setPendingDelete] = useState<VacationBlock | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setState({ status: 'loading' });
      try {
        const res = await apiClient.get<VacationResponse>(
          `/api/specialists/${specialistId}/vacation`,
        );
        if (res.status === 200) {
          setState({ status: 'ready', items: res.data.items });
        } else {
          setState({
            status: 'error',
            message: `Nie udało się wczytać bloków urlopu (kod ${res.status}).`,
          });
        }
      } catch {
        setState({
          status: 'error',
          message: 'Błąd połączenia z zamockowanym backendem.',
        });
      }
    },
    [specialistId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = useCallback(() => void load({ silent: true }), [load]);

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await apiClient.request<{ ok: true }>(
        'DELETE',
        `/api/specialists/${specialistId}/vacation/${pendingDelete.id}`,
      );
      if (res.status === 200 || res.status === 204 || res.status === 404) {
        // 404 = blok już nie istnieje; i tak odświeżamy listę.
        setPendingDelete(null);
        refetch();
      } else {
        setDeleteError(`Nie udało się usunąć bloku (kod ${res.status}).`);
      }
    } catch {
      setDeleteError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <VacationForm specialistId={specialistId} onCreated={refetch} />

      <section aria-label="Aktywne bloki urlopu" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Aktywne bloki</h2>

        {deleteError && (
          <p
            role="alert"
            className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
          >
            {deleteError}
          </p>
        )}

        {state.status === 'loading' && <VacationListSkeleton />}

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

        {state.status === 'ready' && state.items.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl2 border border-slate-200/70 bg-white p-10 text-center shadow-card">
            <EmptyResults className="h-32 w-32" />
            <div className="flex flex-col gap-1">
              <h3 role="status" className="text-lg font-semibold text-ink">
                Brak aktywnych bloków
              </h3>
              <p className="max-w-md text-sm text-ink-muted">
                Nie masz włączonego trybu urlop/choroba. Twoje wolne terminy są
                widoczne dla pacjentów. Włącz tryb powyżej, aby zablokować
                wybrany okres.
              </p>
            </div>
          </div>
        )}

        {state.status === 'ready' && state.items.length > 0 && (
          <ul className="flex flex-col gap-3">
            {state.items.map((block) => (
              <li key={block.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-base font-semibold text-ink">
                        {formatRange(block)}
                      </span>
                      <span className="text-sm text-ink-muted">
                        {block.reason && block.reason.trim().length > 0
                          ? block.reason
                          : 'Bez podanego powodu'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDeleteError(null);
                        setPendingDelete(block);
                      }}
                      className="text-danger-700 hover:bg-danger-50"
                    >
                      Usuń
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmActionDialog
        open={pendingDelete !== null}
        title="Usunąć blok urlopu?"
        description={
          <>
            {pendingDelete && (
              <>
                Blok <strong>{formatRange(pendingDelete)}</strong> zostanie
                usunięty. Terminy z tego zakresu zostaną odblokowane i znów będą
                widoczne dla pacjentów (poza już zajętymi).
              </>
            )}
          </>
        }
        confirmLabel="Usuń blok"
        tone="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Formularz włączenia trybu urlop/choroba
 * ------------------------------------------------------------------ */

function VacationForm({
  specialistId,
  onCreated,
}: {
  specialistId: string;
  onCreated: () => void;
}) {
  const fromId = useId();
  const toId = useId();
  const reasonId = useId();

  const today = useMemo(() => todayInWarsaw(), []);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): string | null {
    if (!from || !to) return 'Podaj datę początku i datę końca.';
    if (from < today) return 'Data początku nie może być w przeszłości.';
    if (to < from) return 'Data końca nie może być wcześniejsza niż początek.';
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    const trimmedReason = reason.trim();
    const body: CreateVacationBody = {
      from: warsawDayToIso(from, false),
      to: warsawDayToIso(to, true),
      ...(trimmedReason ? { reason: trimmedReason } : {}),
    };

    setSubmitting(true);
    try {
      const res = await apiClient.post<VacationBlock>(
        `/api/specialists/${specialistId}/vacation`,
        body,
      );
      if (res.status === 201 || res.status === 200) {
        setFrom('');
        setTo('');
        setReason('');
        setSuccess(true);
        onCreated();
      } else if (res.status === 400) {
        setError('Nieprawidłowy zakres dat. Sprawdź daty i spróbuj ponownie.');
      } else {
        setError(`Nie udało się zablokować terminów (kod ${res.status}).`);
      }
    } catch {
      setError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">
            Włącz tryb urlop/choroba
          </h2>
          <p className="text-sm text-ink-muted">
            Wybierz zakres dat. Wolne terminy z tego okresu zostaną zablokowane i
            znikną z wyszukiwarki oraz profilu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={fromId} className="text-sm font-medium text-ink">
                Data od
              </label>
              <input
                id={fromId}
                type="date"
                value={from}
                min={today}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setSuccess(false);
                }}
                className={FIELD_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={toId} className="text-sm font-medium text-ink">
                Data do
              </label>
              <input
                id={toId}
                type="date"
                value={to}
                min={from || today}
                onChange={(e) => {
                  setTo(e.target.value);
                  setSuccess(false);
                }}
                className={FIELD_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor={reasonId} className="text-sm font-medium text-ink">
                Powód{' '}
                <span className="font-normal text-ink-subtle">
                  (opcjonalnie)
                </span>
              </label>
              <input
                id={reasonId}
                type="text"
                value={reason}
                maxLength={120}
                onChange={(e) => setReason(e.target.value)}
                className={FIELD_CLASS}
                placeholder="Np. urlop, konferencja, zwolnienie lekarskie"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
            >
              {error}
            </p>
          )}

          {success && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
            >
              <span>Zablokowano terminy w wybranym okresie.</span>
              <Link
                href="/panel/grafik"
                className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                Zobacz grafik
              </Link>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={submitting}>
              Włącz tryb urlop
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function VacationSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Wczytuję dane trybu urlop…</span>
      <div
        aria-hidden="true"
        className="h-56 animate-pulse rounded-xl2 bg-surface-subtle"
      />
      <div
        aria-hidden="true"
        className="h-24 animate-pulse rounded-xl2 bg-surface-subtle"
      />
    </div>
  );
}

function VacationListSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Wczytuję bloki urlopu…</span>
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-20 animate-pulse rounded-xl2 bg-surface-subtle"
        />
      ))}
    </div>
  );
}
