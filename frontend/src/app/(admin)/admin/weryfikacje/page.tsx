'use client';

/**
 * (admin) /admin/weryfikacje — Kolejka weryfikacji PWZ (F1).
 *
 * Guard roli admina i nawigacja są w layoucie grupy (admin) — tutaj renderujemy
 * wyłącznie treść. Lista kandydatów pochodzi z `GET /api/admin/verifications`
 * (stany `weryfikacja_reczna` oraz `zarejestrowany`). Akcje:
 *  - Zatwierdź → `POST /api/admin/verifications/:id/approve` (409, gdy stan nie
 *    pozwala na bezpośrednią decyzję, np. „zarejestrowany”);
 *  - Odrzuć → modal z wymaganym powodem → `POST .../reject { reason }` (400 przy
 *    pustym powodzie). `:id` = specialistId. Po akcji lista jest odświeżana.
 *
 * Daty formatowane w strefie Europe/Warsaw (Intl).
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ProfessionalRegistry, VerificationState } from '@/domain';
import type {
  AdminVerificationItem,
  AdminVerificationsResponse,
  RejectVerificationBody,
} from '@/domain';
import { Button, Card, CardContent, Chip } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { EmptyResults, ShieldCheck } from '@/components/illustrations';
import { AdminActionDialog } from '@/components/admin/AdminActionDialog';

/* ------------------------------------------------------------------ *
 * Formatowanie i słowniki prezentacyjne
 * ------------------------------------------------------------------ */

const TZ = 'Europe/Warsaw';
const dateTimeFmt = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

/** Formatuje ISO 8601 do czytelnej daty (Europe/Warsaw); `null` gdy brak/nieprawidłowa. */
function formatWarsaw(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateTimeFmt.format(date);
}

const REGISTRY_LABEL: Record<ProfessionalRegistry, string> = {
  [ProfessionalRegistry.KRL]: 'Krajowy Rejestr Logopedów',
  [ProfessionalRegistry.KIF]: 'Krajowa Izba Fizjoterapeutów',
};

interface StateChipInfo {
  label: string;
  className: string;
}

const STATE_CHIP: Record<VerificationState, StateChipInfo> = {
  [VerificationState.Zarejestrowany]: {
    label: 'Zarejestrowany',
    className: 'bg-surface-subtle text-ink-muted',
  },
  [VerificationState.WeryfikacjaAuto]: {
    label: 'Weryfikacja automatyczna',
    className: 'bg-warning-50 text-warning-700',
  },
  [VerificationState.WeryfikacjaReczna]: {
    label: 'Weryfikacja ręczna',
    className: 'bg-warning-50 text-warning-700',
  },
  [VerificationState.Zweryfikowany]: {
    label: 'Zweryfikowany',
    className: 'bg-brand-50 text-brand-800',
  },
  [VerificationState.Odrzucony]: {
    label: 'Odrzucony',
    className: 'bg-danger-50 text-danger-700',
  },
  [VerificationState.Opublikowany]: {
    label: 'Opublikowany',
    className: 'bg-brand-100 text-brand-800',
  },
};

/* ------------------------------------------------------------------ *
 * Typy stanu widoku
 * ------------------------------------------------------------------ */

type LoadStatus = 'loading' | 'ready' | 'error';
type RowFeedback = { tone: 'success' | 'error' | 'info'; message: string };

/* ------------------------------------------------------------------ *
 * Ekran
 * ------------------------------------------------------------------ */

export default function WeryfikacjePage() {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [items, setItems] = useState<AdminVerificationItem[]>([]);

  // Feedback per wiersz (kluczowany specialistId) + wskaźnik zajętości wiersza.
  const [feedback, setFeedback] = useState<Record<string, RowFeedback | undefined>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // Modal odrzucenia.
  const [rejectTarget, setRejectTarget] = useState<AdminVerificationItem | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [rejectPending, setRejectPending] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    try {
      const res = await apiClient.get<AdminVerificationsResponse>(
        '/api/admin/verifications',
      );
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

  const setRowFeedback = useCallback((id: string, value: RowFeedback | undefined) => {
    setFeedback((prev) => ({ ...prev, [id]: value }));
  }, []);

  async function handleApprove(item: AdminVerificationItem) {
    setBusyId(item.specialistId);
    setRowFeedback(item.specialistId, undefined);
    try {
      const res = await apiClient.post(
        `/api/admin/verifications/${item.specialistId}/approve`,
      );
      if (res.status === 200) {
        setRowFeedback(item.specialistId, {
          tone: 'success',
          message: `Zatwierdzono weryfikację: ${item.specialistName}.`,
        });
        await load(true);
      } else if (res.status === 409) {
        setRowFeedback(item.specialistId, {
          tone: 'error',
          message:
            'To zgłoszenie jest w stanie „zarejestrowany” i nie pozwala na bezpośrednią decyzję — musi najpierw przejść weryfikację automatyczną (D1).',
        });
      } else if (res.status === 404) {
        setRowFeedback(item.specialistId, {
          tone: 'error',
          message: 'Nie znaleziono zgłoszenia. Odśwież kolejkę.',
        });
      } else {
        setRowFeedback(item.specialistId, {
          tone: 'error',
          message: `Nie udało się zatwierdzić (kod ${res.status}).`,
        });
      }
    } catch {
      setRowFeedback(item.specialistId, {
        tone: 'error',
        message: 'Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.',
      });
    } finally {
      setBusyId(null);
    }
  }

  function openReject(item: AdminVerificationItem) {
    setRejectTarget(item);
    setReason('');
    setReasonError(null);
    setDialogError(null);
  }

  function closeReject() {
    if (rejectPending) return;
    setRejectTarget(null);
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const trimmed = reason.trim();
    if (trimmed === '') {
      setReasonError('Podaj powód odrzucenia (będzie widoczny dla specjalisty).');
      return;
    }
    setReasonError(null);
    setDialogError(null);
    setRejectPending(true);
    try {
      const body: RejectVerificationBody = { reason: trimmed };
      const res = await apiClient.post(
        `/api/admin/verifications/${rejectTarget.specialistId}/reject`,
        body,
      );
      if (res.status === 200) {
        const name = rejectTarget.specialistName;
        const id = rejectTarget.specialistId;
        setRejectTarget(null);
        setRowFeedback(id, {
          tone: 'info',
          message: `Odrzucono zgłoszenie: ${name}. Powód został zapisany i będzie widoczny dla specjalisty.`,
        });
        await load(true);
      } else if (res.status === 400) {
        setReasonError('Powód jest wymagany.');
      } else if (res.status === 409) {
        setDialogError(
          'Nie można odrzucić w tym stanie — zgłoszenie „zarejestrowany” nie pozwala na bezpośrednią decyzję (musi najpierw przejść weryfikację automatyczną).',
        );
      } else if (res.status === 404) {
        setDialogError('Nie znaleziono zgłoszenia. Odśwież kolejkę.');
      } else {
        setDialogError(`Nie udało się odrzucić (kod ${res.status}).`);
      }
    } catch {
      setDialogError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setRejectPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-ink">Kolejka weryfikacji PWZ</h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Ręczny przegląd zgłoszeń numerów PWZ (fallback automatu D1). Zatwierdź
            zgłoszenie lub odrzuć je z powodem widocznym dla specjalisty.
          </p>
          <BeBadge
            endpoint="GET /api/admin/verifications"
            desc="Kolejka weryfikacji z zamockowanego backendu (MSW), silnik F1-verify."
            className="mt-1 self-start"
          />
        </div>
        <ShieldCheck className="hidden h-16 w-16 shrink-0 sm:block" />
      </header>

      {status === 'loading' && (
        <div className="flex flex-col gap-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl2 bg-surface-subtle" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm font-medium text-danger-700" role="alert">
              Nie udało się wczytać kolejki weryfikacji z zamockowanego backendu.
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
                Kolejka weryfikacji jest pusta
              </h3>
              <p className="max-w-md text-sm text-ink-muted">
                Brak zgłoszeń oczekujących na ręczną decyzję. Nowe zgłoszenia
                pojawią się tutaj automatycznie.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'ready' && items.length > 0 && (
        <ul className="flex flex-col gap-4">
          {items.map((item) => {
            const chip = STATE_CHIP[item.state];
            const submitted = formatWarsaw(item.submittedAt);
            const sla = formatWarsaw(item.slaDeadline);
            const slaOverdue =
              item.slaDeadline !== undefined &&
              !Number.isNaN(Date.parse(item.slaDeadline)) &&
              Date.parse(item.slaDeadline) < Date.now();
            const isRegistered = item.state === VerificationState.Zarejestrowany;
            const rowBusy = busyId === item.specialistId;
            const rowFeedback = feedback[item.specialistId];

            return (
              <li key={item.specialistId}>
                <Card>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ink">
                            {item.specialistName}
                          </h3>
                          <Chip className={chip.className}>{chip.label}</Chip>
                        </div>
                        <p className="text-sm text-ink-muted">
                          PWZ:{' '}
                          <span
                            className="font-medium text-ink"
                            title={REGISTRY_LABEL[item.registry]}
                          >
                            {item.pwzNumber}
                          </span>{' '}
                          ({item.registry})
                        </p>
                      </div>
                    </div>

                    <dl className="flex flex-col gap-1.5 rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-3 text-sm">
                      {submitted && (
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                          <dt className="min-w-[9rem] text-ink-subtle">Zgłoszono</dt>
                          <dd className="font-medium text-ink">{submitted}</dd>
                        </div>
                      )}
                      {sla && (
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                          <dt className="min-w-[9rem] text-ink-subtle">Termin SLA</dt>
                          <dd
                            className={
                              slaOverdue
                                ? 'font-medium text-danger-700'
                                : 'font-medium text-ink'
                            }
                          >
                            {sla}
                            {slaOverdue && ' — po terminie'}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {isRegistered && (
                      <p className="rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-2 text-xs text-ink-subtle">
                        Zgłoszenie w stanie „zarejestrowany” nie pozwala na
                        bezpośrednią decyzję — musi najpierw przejść weryfikację
                        automatyczną (D1). Próba akcji zwróci konflikt (409).
                      </p>
                    )}

                    {rowFeedback && (
                      <p
                        role={rowFeedback.tone === 'error' ? 'alert' : 'status'}
                        className={
                          rowFeedback.tone === 'error'
                            ? 'rounded-xl2 border border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700'
                            : rowFeedback.tone === 'success'
                              ? 'rounded-xl2 border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-800'
                              : 'rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-2 text-sm text-ink-muted'
                        }
                      >
                        {rowFeedback.message}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="primary"
                        loading={rowBusy}
                        onClick={() => void handleApprove(item)}
                      >
                        Zatwierdź
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={rowBusy}
                        onClick={() => openReject(item)}
                        className="border-danger-600 text-danger-700 hover:bg-danger-50 active:bg-danger-100"
                      >
                        Odrzuć
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
        open={rejectTarget !== null}
        title="Odrzuć weryfikację PWZ"
        description={
          rejectTarget
            ? `Podaj powód odrzucenia zgłoszenia ${rejectTarget.specialistName} (PWZ ${rejectTarget.pwzNumber}). Powód będzie widoczny dla specjalisty.`
            : undefined
        }
        tone="danger"
        confirmLabel="Odrzuć zgłoszenie"
        loading={rejectPending}
        onConfirm={() => void confirmReject()}
        onClose={closeReject}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="reject-reason" className="text-sm font-medium text-ink">
            Powód odrzucenia
          </label>
          <textarea
            id="reject-reason"
            data-autofocus
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={reasonError ? true : undefined}
            aria-describedby={reasonError ? 'reject-reason-error' : undefined}
            placeholder="np. numer PWZ nie figuruje w rejestrze KRL/KIF"
            className="resize-y rounded-xl2 border border-slate-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          />
          {reasonError && (
            <p id="reject-reason-error" className="text-xs text-danger-600">
              {reasonError}
            </p>
          )}
          {dialogError && (
            <p
              role="alert"
              className="rounded-xl2 border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700"
            >
              {dialogError}
            </p>
          )}
        </div>
      </AdminActionDialog>
    </section>
  );
}
