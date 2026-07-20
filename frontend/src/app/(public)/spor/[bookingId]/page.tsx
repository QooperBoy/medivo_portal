'use client';

/**
 * (public) /spor/[bookingId] — spór o nieobecność (B6, PUBLICZNA).
 *
 * Odczytuje wizytę (`GET /api/bookings/:id`). Gdy jest w stanie `no_show`,
 * pokazuje formularz sporu („twierdzisz, że byłeś/aś na wizycie") z opcjonalnym
 * opisem i przyciskiem „Otwórz spór" → `POST /api/bookings/:id/transition`
 * (`no_show → disputed`). Po sukcesie: informacja, że spór rozpatrzy administrator
 * (F3). Inne stany oraz nieznany token (404) mają osobne komunikaty.
 */

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { BookingState } from '@/domain';
import type { Booking } from '@/domain';
import { Button, Card, CardContent } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { BookingStateBadge } from '@/components/patient/BookingStateBadge';
import { BookingSuccess } from '@/components/illustrations';

type Phase = 'loading' | 'notFound' | 'error' | 'form' | 'ineligible' | 'done';

const TZ = 'Europe/Warsaw';

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

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${dateFmt.format(date)}, godz. ${timeFmt.format(date)}`;
}

const linkPrimary =
  'inline-flex h-11 items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';
const linkOutline =
  'inline-flex h-11 items-center justify-center rounded-xl2 border border-brand-600 bg-white px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';

export default function SporPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const { bookingId } = params;

  const [phase, setPhase] = useState<Phase>('loading');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [transition, setTransition] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPhase('loading');

    (async () => {
      try {
        const res = await apiClient.get<Booking>(
          `/api/bookings/${encodeURIComponent(bookingId)}`,
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
        setPhase(res.data.state === BookingState.NoShow ? 'form' : 'ineligible');
      } catch {
        if (active) setPhase('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [bookingId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<Booking>(
        `/api/bookings/${encodeURIComponent(booking.id)}/transition`,
        { to: BookingState.Disputed },
      );
      if (res.status === 200) {
        setBooking(res.data);
        setTransition(
          res.stateTransition ??
            `${BookingState.NoShow}→${BookingState.Disputed}`,
        );
        setPhase('done');
      } else if (res.status === 409) {
        setError(
          'Nie można otworzyć sporu — stan wizyty zmienił się w międzyczasie.',
        );
      } else if (res.status === 404) {
        setPhase('notFound');
      } else {
        setError('Nie udało się zgłosić sporu. Spróbuj ponownie.');
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
          <div className="h-80 rounded-xl2 bg-surface-subtle" />
        </div>
      )}

      {phase === 'notFound' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <h1 className="text-xl font-semibold text-ink">Nieprawidłowy link</h1>
            <p className="max-w-md text-sm text-ink-muted">
              Nie znaleziono wizyty dla tego linku. Dane demo mogły się
              zresetować przy odświeżeniu strony.
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

      {phase === 'ineligible' && booking && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <h1 className="text-xl font-semibold text-ink">
              Spór jest niedostępny
            </h1>
            <BookingStateBadge state={booking.state} />
            <p className="max-w-md text-sm text-ink-muted">
              Spór można zgłosić tylko dla wizyty oznaczonej jako nieobecność
              (no-show). Ta wizyta jest w innym stanie.
            </p>
            <Link href="/moje-wizyty" className={linkOutline}>
              Moje wizyty
            </Link>
          </CardContent>
        </Card>
      )}

      {phase === 'done' && booking && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <BookingSuccess className="h-32 w-32" />
            <h1 className="text-2xl font-bold text-ink">Spór zgłoszony</h1>
            <BookingStateBadge state={booking.state} />
            <p className="max-w-md text-sm text-ink-muted">
              Spór rozpatrzy administrator (F3). O rozstrzygnięciu poinformujemy
              osobno. To dane demonstracyjne (MSW).
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

      {phase === 'form' && booking && (
        <Card>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-ink">
                Spór o nieobecność
              </h1>
              <p className="text-sm text-ink-muted">
                Twierdzisz, że byłeś/aś na wizycie, a została oznaczona jako
                nieobecność? Zgłoś spór — rozpatrzy go administrator (F3).
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-xl2 border border-slate-200/70 bg-surface-muted p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink-subtle">Termin</span>
                <span className="text-right text-sm font-semibold text-ink">
                  {formatDateTime(booking.startsAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink-subtle">Stan</span>
                <BookingStateBadge state={booking.state} />
              </div>
            </div>

            <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="dispute-description"
                  className="text-sm font-medium text-ink"
                >
                  Opis sytuacji{' '}
                  <span className="font-normal text-ink-subtle">
                    (opcjonalnie)
                  </span>
                </label>
                <textarea
                  id="dispute-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Np. byłem/am na wizycie online i mam potwierdzenie połączenia."
                  className="w-full rounded-xl2 border border-slate-200 bg-surface-muted px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                />
                <p className="text-xs text-ink-subtle">
                  Opis pomoże administratorowi rozpatrzyć zgłoszenie.
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <BeBadge
                  endpoint="POST /api/bookings/:id/transition"
                  desc="Otwarcie sporu (no_show → disputed) w zamockowanym backendzie (MSW)."
                />
                <Button type="submit" loading={busy}>
                  Otwórz spór
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
