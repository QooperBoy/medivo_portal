'use client';

/**
 * (public) /odwolaj/[token] — odwołanie wizyty przez link (B3, PUBLICZNA).
 *
 * `token` = id rezerwacji (mock). Odczytuje wizytę (`GET /api/bookings/:id`),
 * pokazuje podsumowanie i stan. Dla stanu `confirmed` pozwala odwołać wizytę
 * (`POST /api/bookings/:id/transition` → `cancelled_by_patient`; przy terminie
 * < 24 h wysyła `late: true` i ostrzega o „późnym odwołaniu"). Po sukcesie —
 * ekran potwierdzenia. Stany, których nie da się odwołać, oraz nieznany token
 * (404) obsłużone osobnymi komunikatami.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { BookingState } from '@/domain';
import type { Booking } from '@/domain';
import { Button, Card, CardContent } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { BookingStateBadge } from '@/components/patient/BookingStateBadge';
import { BookingSuccess } from '@/components/illustrations';

type Phase = 'loading' | 'notFound' | 'error' | 'loaded' | 'done';

const TZ = 'Europe/Warsaw';
/** 24 h w milisekundach — próg „późnego odwołania" (scoring G7). */
const DAY_MS = 24 * 60 * 60 * 1000;

const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TZ,
});
const timeFmt = new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});
const priceFmt = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
});

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${dateFmt.format(date)}, godz. ${timeFmt.format(date)}`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-ink-subtle">{label}</span>
      <span className="text-right text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

const linkPrimary =
  'inline-flex h-11 items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';
const linkOutline =
  'inline-flex h-11 items-center justify-center rounded-xl2 border border-brand-600 bg-white px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';

/** Komunikat, dlaczego wizyty w danym stanie nie można odwołać. */
function cannotCancelReason(state: BookingState): string {
  switch (state) {
    case BookingState.CancelledByPatient:
    case BookingState.CancelledBySpecialist:
      return 'Ta wizyta jest już odwołana.';
    case BookingState.Completed:
      return 'Ta wizyta już się odbyła — nie można jej odwołać.';
    case BookingState.NoShow:
    case BookingState.Disputed:
      return 'Ta wizyta jest oznaczona jako nieobecność i nie można jej odwołać.';
    default:
      return 'Tej wizyty nie można odwołać w tym miejscu.';
  }
}

export default function OdwolajPage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [phase, setPhase] = useState<Phase>('loading');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transition, setTransition] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPhase('loading');

    (async () => {
      try {
        const res = await apiClient.get<Booking>(
          `/api/bookings/${encodeURIComponent(token)}`,
        );
        if (!active) return;
        if (res.status === 404) {
          setPhase('notFound');
          return;
        }
        if (res.status !== 200) {
          setPhase('error');
          return;
        }
        setBooking(res.data);
        setPhase('loaded');
      } catch {
        if (active) setPhase('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  /** Ciche odświeżenie stanu wizyty (po konflikcie 409). */
  async function refreshBooking() {
    try {
      const res = await apiClient.get<Booking>(
        `/api/bookings/${encodeURIComponent(token)}`,
      );
      if (res.status === 200) setBooking(res.data);
    } catch {
      // ignorujemy — pokazujemy dotychczasowy stan wraz z komunikatem błędu
    }
  }

  const isLate =
    booking !== null && Date.parse(booking.startsAt) - Date.now() < DAY_MS;

  async function runCancel() {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<Booking>(
        `/api/bookings/${encodeURIComponent(booking.id)}/transition`,
        { to: BookingState.CancelledByPatient, late: isLate },
      );
      if (res.status === 200) {
        setBooking(res.data);
        setTransition(
          res.stateTransition ??
            `${BookingState.Confirmed}→${BookingState.CancelledByPatient}`,
        );
        setPhase('done');
      } else if (res.status === 409) {
        setConfirming(false);
        setError(
          'Tej wizyty nie można już odwołać — jej stan zmienił się w międzyczasie.',
        );
        await refreshBooking();
      } else if (res.status === 404) {
        setPhase('notFound');
      } else {
        setError('Nie udało się odwołać wizyty. Spróbuj ponownie.');
      }
    } catch {
      setError('Błąd połączenia z zamockowanym backendem.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      {phase === 'loading' && (
        <div className="animate-pulse" aria-hidden="true">
          <div className="h-72 rounded-xl2 bg-surface-subtle" />
        </div>
      )}

      {phase === 'notFound' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <h1 className="text-xl font-semibold text-ink">Nieprawidłowy link</h1>
            <p className="max-w-md text-sm text-ink-muted">
              Nie znaleziono wizyty dla tego linku. Dane demo mogły się
              zresetować przy odświeżeniu strony — wróć do listy wizyt lub umów
              wizytę ponownie.
            </p>
            <Link href="/moje-wizyty" className={linkPrimary}>
              Przejdź do moich wizyt
            </Link>
          </CardContent>
        </Card>
      )}

      {phase === 'error' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <h1 className="text-xl font-semibold text-ink">
              Nie udało się wczytać wizyty
            </h1>
            <p className="max-w-md text-sm text-ink-muted">
              Wystąpił problem z połączeniem z zamockowanym backendem (MSW).
              Spróbuj ponownie za chwilę.
            </p>
            <Link href="/moje-wizyty" className={linkOutline}>
              Wróć do moich wizyt
            </Link>
          </CardContent>
        </Card>
      )}

      {phase === 'done' && booking && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <BookingSuccess className="h-32 w-32" />
            <h1 className="text-2xl font-bold text-ink">Wizyta odwołana</h1>
            <BookingStateBadge state={booking.state} />
            <p className="max-w-md text-sm text-ink-muted">
              Termin wizyty ({formatDateTime(booking.startsAt)}) wrócił do puli
              wolnych. To dane demonstracyjne — potwierdzenie e-mail nie jest
              wysyłane.
            </p>
            {transition && (
              <p className="text-xs text-ink-subtle">
                Przejście stanu:{' '}
                <span className="font-mono font-semibold">{transition}</span>
              </p>
            )}
            <Link href="/moje-wizyty" className={linkPrimary}>
              Moje wizyty
            </Link>
          </CardContent>
        </Card>
      )}

      {phase === 'loaded' && booking && (
        <Card>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-ink">Odwołanie wizyty</h1>
              <p className="text-sm text-ink-muted">
                Sprawdź szczegóły i potwierdź odwołanie. To dane demonstracyjne
                (MSW).
              </p>
            </div>

            <div className="flex flex-col divide-y divide-slate-200/70 rounded-xl2 border border-slate-200/70 bg-surface-muted px-4">
              <SummaryRow label="Pacjent" value={booking.patientName} />
              <SummaryRow
                label="Termin"
                value={formatDateTime(booking.startsAt)}
              />
              <SummaryRow label="Cena" value={priceFmt.format(booking.pricePln)} />
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-sm text-ink-subtle">Stan</span>
                <BookingStateBadge state={booking.state} />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700"
              >
                {error}
              </p>
            )}

            {booking.state === BookingState.Confirmed ? (
              confirming ? (
                <div className="flex flex-col gap-3">
                  <div
                    className={
                      isLate
                        ? 'rounded-xl2 border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700'
                        : 'rounded-xl2 border border-slate-200/70 bg-surface-muted p-4 text-sm text-ink-muted'
                    }
                  >
                    {isLate ? (
                      <>
                        Do wizyty pozostało mniej niż 24 h. To „późne
                        odwołanie&rdquo; — może wpłynąć na Twój scoring (silnik
                        G7). Czy na pewno chcesz odwołać wizytę?
                      </>
                    ) : (
                      <>
                        Czy na pewno chcesz odwołać tę wizytę? Termin wróci do puli
                        wolnych.
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="danger"
                      loading={busy}
                      onClick={() => void runCancel()}
                    >
                      Potwierdź odwołanie
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setConfirming(false)}
                    >
                      Zostaw wizytę
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {isLate && (
                    <p className="rounded-xl2 border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700">
                      Uwaga: do wizyty pozostało mniej niż 24 h — odwołanie
                      zostanie potraktowane jako „późne&rdquo; (scoring G7).
                    </p>
                  )}
                  <Button variant="outline" onClick={() => setConfirming(true)}>
                    Odwołaj wizytę
                  </Button>
                </div>
              )
            ) : (
              <p className="rounded-xl2 border border-slate-200/70 bg-surface-muted p-4 text-sm text-ink-muted">
                {cannotCancelReason(booking.state)}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <BeBadge
                endpoint="POST /api/bookings/:id/transition"
                desc="Odwołanie wizyty (confirmed → cancelled_by_patient) w zamockowanym backendzie (MSW)."
              />
              <Link href="/moje-wizyty" className={linkOutline}>
                Moje wizyty
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
