'use client';

/**
 * (admin) /admin/spory — Spory o nieobecność (F3).
 *
 * Guard roli admina i nawigacja są w layoucie grupy (admin) — tutaj renderujemy
 * wyłącznie treść. Lista rezerwacji w stanie `disputed` pochodzi z
 * `GET /api/admin/disputes`. Rozstrzygnięcie (po `:id` = id rezerwacji) przez
 * `POST /api/admin/disputes/:id/resolve { outcome }`:
 *  - „Uznaj wizytę”  → outcome `completed` (przejście disputed→completed);
 *  - „Podtrzymaj nieobecność” → outcome `no_show` (przejście disputed→no_show).
 * Po akcji prezentujemy przechwycony nagłówek `x-state-transition` i odświeżamy
 * listę (rozstrzygnięta pozycja opuszcza kolejkę).
 *
 * RODO: prezentujemy dane minimalne pacjenta (imię i nazwisko). Daty w strefie
 * Europe/Warsaw (Intl).
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { BookingState } from '@/domain';
import type {
  AdminDisputeItem,
  AdminDisputesResponse,
  ResolveDisputeBody,
} from '@/domain';
import { Button, Card, CardContent, Chip } from '@/components/ui';
import { BookingStateBadge } from '@/components/patient/BookingStateBadge';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { EmptyResults } from '@/components/illustrations';
import { AdminActionDialog } from '@/components/admin/AdminActionDialog';

/* ------------------------------------------------------------------ *
 * Formatowanie
 * ------------------------------------------------------------------ */

const TZ = 'Europe/Warsaw';
const dateTimeFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

function formatWarsaw(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateTimeFmt.format(date);
}

/* ------------------------------------------------------------------ *
 * Typy stanu widoku
 * ------------------------------------------------------------------ */

type LoadStatus = 'loading' | 'ready' | 'error';
type Outcome = ResolveDisputeBody['outcome'];
type Notice = { message: string; transition: string | null };

const OUTCOME_OPTIONS: readonly { value: Outcome; label: string; hint: string }[] = [
  {
    value: 'completed',
    label: 'Uznaj wizytę (completed)',
    hint: 'Spór rozstrzygnięty na korzyść pacjenta — wizyta zostaje uznana za odbytą.',
  },
  {
    value: 'no_show',
    label: 'Podtrzymaj nieobecność (no_show)',
    hint: 'Spór odrzucony — nieobecność pacjenta zostaje podtrzymana (sankcje scoringu G7).',
  },
];

/* ------------------------------------------------------------------ *
 * Ekran
 * ------------------------------------------------------------------ */

export default function SporyPage() {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [items, setItems] = useState<AdminDisputeItem[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Modal rozstrzygnięcia.
  const [resolveTarget, setResolveTarget] = useState<AdminDisputeItem | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [resolvePending, setResolvePending] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    try {
      const res = await apiClient.get<AdminDisputesResponse>('/api/admin/disputes');
      if (res.status < 400 && Array.isArray(res.data?.items)) {
        setItems(res.data.items);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openResolve(item: AdminDisputeItem) {
    setResolveTarget(item);
    setOutcome(null);
    setOutcomeError(null);
    setDialogError(null);
  }

  function closeResolve() {
    if (resolvePending) return;
    setResolveTarget(null);
  }

  async function confirmResolve() {
    if (!resolveTarget) return;
    if (outcome === null) {
      setOutcomeError('Wybierz wynik rozstrzygnięcia.');
      return;
    }
    setOutcomeError(null);
    setDialogError(null);
    setResolvePending(true);
    try {
      const body: ResolveDisputeBody = { outcome };
      const res = await apiClient.post(
        `/api/admin/disputes/${resolveTarget.id}/resolve`,
        body,
      );
      if (res.status === 200) {
        const patient = resolveTarget.patientName;
        const target =
          outcome === 'completed' ? BookingState.Completed : BookingState.NoShow;
        const transition =
          res.stateTransition ?? `${BookingState.Disputed}→${target}`;
        setResolveTarget(null);
        setNotice({
          message: `Rozstrzygnięto spór (${patient}): ${
            outcome === 'completed'
              ? 'wizyta uznana za odbytą'
              : 'nieobecność podtrzymana'
          }.`,
          transition,
        });
        await load(true);
      } else if (res.status === 409) {
        setDialogError(
          'Nie można rozstrzygnąć — rezerwacja nie jest już w stanie sporu. Odśwież listę.',
        );
      } else if (res.status === 404) {
        setDialogError('Nie znaleziono rezerwacji. Odśwież listę.');
      } else if (res.status === 400) {
        setDialogError('Nieprawidłowy wynik rozstrzygnięcia.');
      } else {
        setDialogError(`Nie udało się rozstrzygnąć sporu (kod ${res.status}).`);
      }
    } catch {
      setDialogError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setResolvePending(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-ink">Spory o nieobecność</h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          Rozstrzygaj spory, w których pacjent kwestionuje zgłoszoną nieobecność
          (B6). Decyzja przenosi rezerwację ze stanu sporu do „odbyta” lub
          „nieobecność”.
        </p>
        <BeBadge
          endpoint="GET /api/admin/disputes"
          desc="Lista sporów z zamockowanego backendu (MSW), silnik F3-disputes."
          className="mt-1 self-start"
        />
      </header>

      {notice && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl2 border border-brand-200 bg-brand-50 px-4 py-3"
        >
          <p className="text-sm font-medium text-brand-800">{notice.message}</p>
          {notice.transition && (
            <p className="font-mono text-xs text-brand-700">
              x-state-transition: {notice.transition}
            </p>
          )}
        </div>
      )}

      {status === 'loading' && (
        <div className="flex flex-col gap-4" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl2 bg-surface-subtle" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm font-medium text-danger-700" role="alert">
              Nie udało się wczytać listy sporów z zamockowanego backendu.
            </p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      )}

      {status === 'ready' && items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <EmptyResults className="h-40 w-52" />
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-ink">
                Brak otwartych sporów
              </h3>
              <p className="max-w-md text-sm text-ink-muted">
                Żadna rezerwacja nie oczekuje na rozstrzygnięcie. Nowe spory pojawią
                się tutaj automatycznie.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'ready' && items.length > 0 && (
        <ul className="flex flex-col gap-4">
          {items.map((item) => {
            const term = formatWarsaw(item.startsAt);
            return (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ink">
                            {item.specialistName}
                          </h3>
                          <BookingStateBadge state={BookingState.Disputed} />
                        </div>
                        <p className="text-sm text-ink-muted">{item.serviceName}</p>
                      </div>
                      {item.patientNoShowCount > 0 && (
                        <Chip
                          variant="outline"
                          title="Wskaźnik nieobecności pochodzi ze scoringu pacjenta (silnik G7)."
                          className="border-warning-200 bg-warning-50 text-warning-700"
                        >
                          Nieobecności pacjenta: {item.patientNoShowCount}
                        </Chip>
                      )}
                    </div>

                    <dl className="flex flex-col gap-1.5 rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-3 text-sm">
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                        {/* RODO: dane minimalne — wyłącznie imię i nazwisko pacjenta. */}
                        <dt className="min-w-[8rem] text-ink-subtle">Pacjent</dt>
                        <dd className="font-medium text-ink">{item.patientName}</dd>
                      </div>
                      {term && (
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                          <dt className="min-w-[8rem] text-ink-subtle">Termin wizyty</dt>
                          <dd className="font-medium text-ink">{term}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => openResolve(item)}
                      >
                        Rozstrzygnij
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <AdminActionDialog
        open={resolveTarget !== null}
        title="Rozstrzygnij spór"
        description={
          resolveTarget
            ? `Wybierz wynik dla wizyty: ${resolveTarget.specialistName} · ${resolveTarget.serviceName} (pacjent: ${resolveTarget.patientName}).`
            : undefined
        }
        confirmLabel="Rozstrzygnij"
        loading={resolvePending}
        onConfirm={() => void confirmResolve()}
        onClose={closeResolve}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-ink">
            Wynik rozstrzygnięcia
          </legend>
          {OUTCOME_OPTIONS.map((option, index) => {
            const active = outcome === option.value;
            return (
              <label
                key={option.value}
                className={
                  'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl2 border px-4 py-3 transition-colors ' +
                  (active
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 bg-white hover:border-brand-300')
                }
              >
                <input
                  type="radio"
                  name="dispute-outcome"
                  value={option.value}
                  checked={active}
                  data-autofocus={index === 0 ? true : undefined}
                  onChange={() => {
                    setOutcome(option.value);
                    setOutcomeError(null);
                  }}
                  className="mt-1 h-4 w-4 accent-brand-700"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-ink">{option.label}</span>
                  <span className="text-xs text-ink-subtle">{option.hint}</span>
                </span>
              </label>
            );
          })}
          {outcomeError && (
            <p className="text-xs text-danger-600">{outcomeError}</p>
          )}
          {dialogError && (
            <p
              role="alert"
              className="rounded-xl2 border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700"
            >
              {dialogError}
            </p>
          )}
        </fieldset>
      </AdminActionDialog>
    </section>
  );
}
