'use client';

/**
 * (admin) /admin/opinie — Moderacja opinii (F2).
 *
 * Guard roli admina i nawigacja są w layoucie grupy (admin) — tutaj renderujemy
 * wyłącznie treść. Lista opinii `pending` pochodzi z `GET /api/admin/reviews`.
 * Akcje (po `:id` = id opinii):
 *  - Zatwierdź → `POST /api/admin/reviews/:id/approve` — opinia zostaje
 *    opublikowana na profilu (A4) i emitowany jest event `review.approved`;
 *  - Odrzuć → modal potwierdzenia (opcjonalna notatka) → `POST .../reject`.
 * Po akcji lista jest odświeżana.
 *
 * Opinie są DANYMI DEMONSTRACYJNYMI (placeholdery), bez superlatywów/rankingów.
 * Daty formatowane w strefie Europe/Warsaw (Intl).
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { AdminReviewItem, AdminReviewsResponse } from '@/domain';
import { Button, Card, CardContent, Chip, RatingStars } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { EmptyResults } from '@/components/illustrations';
import { Sparkle } from '@/components/doodles';
import { AdminActionDialog } from '@/components/admin/AdminActionDialog';

/* ------------------------------------------------------------------ *
 * Formatowanie
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

function formatWarsaw(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateTimeFmt.format(date);
}

/* ------------------------------------------------------------------ *
 * Typy stanu widoku
 * ------------------------------------------------------------------ */

type LoadStatus = 'loading' | 'ready' | 'error';
type RowFeedback = { tone: 'success' | 'error' | 'info'; message: string };

/* ------------------------------------------------------------------ *
 * Ekran
 * ------------------------------------------------------------------ */

export default function OpiniePage() {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [items, setItems] = useState<AdminReviewItem[]>([]);

  const [feedback, setFeedback] = useState<Record<string, RowFeedback | undefined>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // Modal odrzucenia.
  const [rejectTarget, setRejectTarget] = useState<AdminReviewItem | null>(null);
  const [note, setNote] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [rejectPending, setRejectPending] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    try {
      const res = await apiClient.get<AdminReviewsResponse>('/api/admin/reviews');
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

  async function handleApprove(item: AdminReviewItem) {
    setBusyId(item.id);
    setRowFeedback(item.id, undefined);
    try {
      const res = await apiClient.post(`/api/admin/reviews/${item.id}/approve`);
      if (res.status === 200) {
        setRowFeedback(item.id, {
          tone: 'success',
          message: `Opinia zatwierdzona i opublikowana na profilu (${item.specialistName}). Emitowano event review.approved.`,
        });
        await load(true);
      } else if (res.status === 404) {
        setRowFeedback(item.id, {
          tone: 'error',
          message: 'Nie znaleziono opinii. Odśwież listę.',
        });
      } else {
        setRowFeedback(item.id, {
          tone: 'error',
          message: `Nie udało się zatwierdzić opinii (kod ${res.status}).`,
        });
      }
    } catch {
      setRowFeedback(item.id, {
        tone: 'error',
        message: 'Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.',
      });
    } finally {
      setBusyId(null);
    }
  }

  function openReject(item: AdminReviewItem) {
    setRejectTarget(item);
    setNote('');
    setDialogError(null);
  }

  function closeReject() {
    if (rejectPending) return;
    setRejectTarget(null);
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setDialogError(null);
    setRejectPending(true);
    try {
      // Kontrakt F2 (reject) nie przyjmuje treści — `note` to notatka pomocnicza
      // moderatora (nie jest wysyłana do backendu ani do specjalisty).
      const res = await apiClient.post(`/api/admin/reviews/${rejectTarget.id}/reject`);
      if (res.status === 200) {
        const id = rejectTarget.id;
        setRejectTarget(null);
        setRowFeedback(id, {
          tone: 'info',
          message: 'Opinia odrzucona — nie zostanie opublikowana na profilu.',
        });
        await load(true);
      } else if (res.status === 404) {
        setDialogError('Nie znaleziono opinii. Odśwież listę.');
      } else {
        setDialogError(`Nie udało się odrzucić opinii (kod ${res.status}).`);
      }
    } catch {
      setDialogError('Błąd połączenia z zamockowanym backendem. Spróbuj ponownie.');
    } finally {
      setRejectPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-brand-500" />
          <h2 className="text-xl font-semibold text-ink">Moderacja opinii</h2>
        </div>
        <p className="max-w-2xl text-sm text-ink-muted">
          Przeglądaj opinie oczekujące na moderację. Zatwierdzenie publikuje opinię
          na profilu specjalisty (A4) i emituje event{' '}
          <span className="font-mono text-xs text-ink">review.approved</span>.
          Odrzucona opinia nie trafia na profil.
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <BeBadge
            endpoint="GET /api/admin/reviews"
            desc="Kolejka moderacji opinii z zamockowanego backendu (MSW), silnik F2-moderation."
          />
          <Chip variant="outline">dane demonstracyjne</Chip>
        </div>
      </header>

      {status === 'loading' && (
        <div className="flex flex-col gap-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl2 bg-surface-subtle" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm font-medium text-danger-700" role="alert">
              Nie udało się wczytać kolejki opinii z zamockowanego backendu.
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
                Brak opinii do moderacji
              </h3>
              <p className="max-w-md text-sm text-ink-muted">
                Wszystkie opinie zostały rozpatrzone. Nowe zgłoszenia pojawią się
                tutaj automatycznie.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'ready' && items.length > 0 && (
        <ul className="flex flex-col gap-4">
          {items.map((item) => {
            const created = formatWarsaw(item.createdAt);
            const rowBusy = busyId === item.id;
            const rowFeedback = feedback[item.id];

            return (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <RatingStars value={item.rating} />
                        <p className="text-sm text-ink-muted">
                          {item.authorName}
                          {created && (
                            <>
                              {' · '}
                              <span className="text-ink-subtle">{created}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Chip variant="brand" className="shrink-0">
                        {item.specialistName}
                      </Chip>
                    </div>

                    <p className="rounded-xl2 border border-slate-200/70 bg-surface-muted px-4 py-3 text-sm text-ink">
                      {item.text}
                    </p>

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
                        Zatwierdź i opublikuj
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
        title="Odrzuć opinię"
        description={
          rejectTarget
            ? `Opinia autorstwa ${rejectTarget.authorName} (dla: ${rejectTarget.specialistName}) nie zostanie opublikowana na profilu.`
            : undefined
        }
        tone="danger"
        confirmLabel="Odrzuć opinię"
        loading={rejectPending}
        onConfirm={() => void confirmReject()}
        onClose={closeReject}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="reject-note" className="text-sm font-medium text-ink">
            Powód / notatka{' '}
            <span className="font-normal text-ink-subtle">(opcjonalnie)</span>
          </label>
          <textarea
            id="reject-note"
            data-autofocus
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="np. treść narusza zasady moderacji"
            className="resize-y rounded-xl2 border border-slate-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          />
          <p className="text-xs text-ink-subtle">
            Notatka pomocnicza moderatora — nie jest wysyłana do specjalisty.
          </p>
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
