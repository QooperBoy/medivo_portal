'use client';

/**
 * (public) /opinia/[token] — wystawienie opinii po wizycie (B5, PUBLICZNA).
 *
 * `token` = id rezerwacji (mock). Odczytuje wizytę (`GET /api/bookings/:id`);
 * gdy jest w stanie `completed`, pokazuje formularz opinii: interaktywny wybór
 * gwiazdek (1–5), treść i podpis autora (prefill z `patientName`). Wysyłka →
 * `POST /api/reviews`. Opinia trafia do moderacji (F2). 409 (już istnieje /
 * wizyta się nie odbyła) i 404 (nieznany token) mają osobne komunikaty.
 * Opinie w tym demo to dane PRZYKŁADOWE.
 */

import { useEffect, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { BookingState } from '@/domain';
import type { Booking, CreateReviewBody, Review } from '@/domain';
import { cn } from '@/lib/utils';
import { Button, Card, CardContent } from '@/components/ui';
import { BeBadge } from '@/components/be-inspector/BeBadge';
import { BookingStateBadge } from '@/components/patient/BookingStateBadge';
import { BookingSuccess } from '@/components/illustrations';

type Phase = 'loading' | 'notFound' | 'error' | 'form' | 'ineligible' | 'done';

const STAR_PATH =
  'M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.74.99-5.79-4.21-4.1 5.82-.85z';

/** Opisy ocen 1–5 (indeks 0 nieużywany). */
const RATING_LABELS = [
  '',
  'słaba',
  'poniżej oczekiwań',
  'przeciętna',
  'dobra',
  'bardzo dobra',
] as const;

const linkPrimary =
  'inline-flex h-11 items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';
const linkOutline =
  'inline-flex h-11 items-center justify-center rounded-xl2 border border-brand-600 bg-white px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';

/**
 * Interaktywny wybór oceny (radiogroup z natywnych inputów — pełna obsługa
 * klawiatury i czytników ekranu). Wizualnie: gwiazdki reagujące na hover/focus.
 */
function StarPicker({
  value,
  hover,
  onSelect,
  onHover,
}: {
  value: number;
  hover: number | null;
  onSelect: (n: number) => void;
  onHover: (n: number | null) => void;
}) {
  const shown = hover ?? value;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Ocena w skali od 1 do 5"
        className="flex items-center gap-0.5"
        onMouseLeave={() => onHover(null)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="inline-flex cursor-pointer p-1.5">
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onSelect(n)}
              onFocus={() => onHover(n)}
              onBlur={() => onHover(null)}
              onMouseEnter={() => onHover(n)}
              className="peer sr-only"
              aria-label={`${n} z 5 — ${RATING_LABELS[n]}`}
            />
            <svg
              viewBox="0 0 20 20"
              className={cn(
                'h-8 w-8 rounded transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600 peer-focus-visible:ring-offset-2',
                n <= shown ? 'text-warning-500' : 'text-slate-300',
              )}
              fill="currentColor"
              aria-hidden="true"
            >
              <path d={STAR_PATH} />
            </svg>
          </label>
        ))}
      </div>
      <span className="text-sm text-ink-muted" aria-hidden="true">
        {shown > 0 ? `${shown}/5 — ${RATING_LABELS[shown]}` : 'Wybierz ocenę'}
      </span>
    </div>
  );
}

export default function OpiniaPage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [phase, setPhase] = useState<Phase>('loading');
  const [booking, setBooking] = useState<Booking | null>(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textId = useId();
  const authorId = useId();

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
        setAuthorName(res.data.patientName);
        setPhase(
          res.data.state === BookingState.Completed ? 'form' : 'ineligible',
        );
      } catch {
        if (active) setPhase('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  const canSubmit =
    booking !== null &&
    rating >= 1 &&
    rating <= 5 &&
    text.trim() !== '' &&
    authorName.trim() !== '';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const body: CreateReviewBody = {
        bookingId: booking.id,
        rating,
        text: text.trim(),
        authorName: authorName.trim(),
      };
      const res = await apiClient.post<Review>('/api/reviews', body);
      if (res.status === 201) {
        setPhase('done');
      } else if (res.status === 409) {
        setError(
          'Nie można dodać opinii — opinia dla tej wizyty już istnieje albo wizyta się nie odbyła.',
        );
      } else if (res.status === 404) {
        setPhase('notFound');
      } else {
        setError('Nie udało się wysłać opinii. Spróbuj ponownie.');
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
          <div className="h-96 rounded-xl2 bg-surface-subtle" />
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
              Opinię można wystawić po wizycie
            </h1>
            <BookingStateBadge state={booking.state} />
            <p className="max-w-md text-sm text-ink-muted">
              Opinię można dodać dopiero, gdy wizyta zostanie oznaczona jako
              odbyta. Wróć tutaj po zakończonej wizycie.
            </p>
            <Link href="/moje-wizyty" className={linkOutline}>
              Moje wizyty
            </Link>
          </CardContent>
        </Card>
      )}

      {phase === 'done' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <BookingSuccess className="h-32 w-32" />
            <h1 className="text-2xl font-bold text-ink">Dziękujemy za opinię</h1>
            <p className="max-w-md text-sm text-ink-muted">
              Twoja opinia trafiła do moderacji (F2) i pojawi się na profilu
              specjalisty po zatwierdzeniu. To dane demonstracyjne (MSW).
            </p>
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
              <h1 className="text-2xl font-bold text-ink">Wystaw opinię</h1>
              <p className="text-sm text-ink-muted">
                Podziel się wrażeniami z odbytej wizyty. Opinia trafia do
                moderacji (F2) przed publikacją.
              </p>
            </div>

            <p className="rounded-xl2 border border-brand-200 bg-brand-50/60 p-4 text-sm text-ink-muted">
              To dane demonstracyjne — opinia nie jest publikowana od razu i nie
              wywołuje żadnej realnej komunikacji.
            </p>

            <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-ink">
                  Ocena wizyty
                </legend>
                <StarPicker
                  value={rating}
                  hover={hoverRating}
                  onSelect={setRating}
                  onHover={setHoverRating}
                />
              </fieldset>

              <div className="flex flex-col gap-2">
                <label htmlFor={textId} className="text-sm font-medium text-ink">
                  Treść opinii
                </label>
                <textarea
                  id={textId}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Opisz przebieg wizyty — rzeczowo, bez danych wrażliwych."
                  className="w-full rounded-xl2 border border-slate-200 bg-surface-muted px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor={authorId}
                  className="text-sm font-medium text-ink"
                >
                  Podpis autora
                </label>
                <input
                  id={authorId}
                  type="text"
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  maxLength={80}
                  autoComplete="name"
                  className="h-11 w-full rounded-xl2 border border-slate-200 bg-surface-muted px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                />
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
                  endpoint="POST /api/reviews"
                  desc="Wystawienie opinii (status pending — moderacja F2) w zamockowanym backendzie (MSW)."
                />
                <Button type="submit" loading={busy} disabled={!canSubmit}>
                  Wyślij opinię
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
