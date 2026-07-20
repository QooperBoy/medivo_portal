'use client';

/**
 * PatientVisitCard — pojedyncza wizyta na liście „Moje wizyty" (B2). Pokazuje
 * specjalistę (awatar + link do profilu A4), usługę, termin (Europe/Warsaw),
 * stan (BookingStateBadge) i cenę. Akcje zależą od flag pozycji:
 *  - `canCancel` → odwołanie wizyty (B4) w dostępnym dialogu potwierdzenia;
 *    przy terminie < 24 h ostrzega o „późnym odwołaniu" (kara scoringu G7)
 *    i wysyła `late: true`;
 *  - `canReview` → link do formularza opinii (B5, /opinia/:id);
 *  - stan `no_show` → link do sporu o nieobecność (B6, /spor/:id).
 * Odwołanie woła `POST /api/bookings/:id/transition`; po sukcesie odświeża listę
 * (`onChanged`) i pokazuje przechwycone przejście (`x-state-transition`).
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { BookingState } from '@/domain';
import type { Booking, PatientBookingItem } from '@/domain';
import { Avatar, Button, Card, CardContent, Chip } from '@/components/ui';
import { BookingStateBadge } from '@/components/patient/BookingStateBadge';

export interface PatientVisitCardProps {
  booking: PatientBookingItem;
  /** Wywoływane po udanym odwołaniu — lista robi refetch. */
  onChanged: () => void;
}

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

/** Link stylizowany na przycisk główny (44px tap target). */
const linkPrimary =
  'inline-flex h-11 items-center justify-center rounded-xl2 bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';
/** Link stylizowany na przycisk konturowy (44px tap target). */
const linkOutline =
  'inline-flex h-11 items-center justify-center rounded-xl2 border border-brand-600 bg-white px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';

/**
 * Dostępny dialog potwierdzenia odwołania (role="dialog", aria-modal, Esc,
 * focus na przycisku potwierdzenia, focus trap Tab, blokada scrolla tła,
 * przywrócenie focusu po zamknięciu). Montowany tylko gdy widoczny.
 */
function CancelDialog({
  description,
  loading,
  onConfirm,
  onClose,
}: {
  description: ReactNode;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (loadingRef.current) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !loading) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={handleOverlayClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="my-0 flex w-full max-w-md flex-col gap-4 rounded-t-xl2 bg-white p-5 shadow-card sm:my-8 sm:rounded-xl2"
      >
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          Odwołać wizytę?
        </h2>
        <div id={descId} className="flex flex-col gap-2 text-sm text-ink-muted">
          {description}
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Zostaw wizytę
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant="danger"
            loading={loading}
            onClick={onConfirm}
          >
            Odwołaj wizytę
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PatientVisitCard({ booking, onChanged }: PatientVisitCardProps) {
  // Do wizyty < 24 h → odwołanie „późne" (late=true; ostrzeżenie o scoringu G7).
  const isLate =
    booking.canCancel && Date.parse(booking.startsAt) - Date.now() < DAY_MS;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function runCancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<Booking>(
        `/api/bookings/${encodeURIComponent(booking.id)}/transition`,
        { to: BookingState.CancelledByPatient, late: isLate },
      );
      if (res.status === 200) {
        setDialogOpen(false);
        setDone(
          res.stateTransition ??
            `${booking.state}→${BookingState.CancelledByPatient}`,
        );
        // Krótka pauza, by pokazać przechwycone przejście, potem refetch listy.
        timerRef.current = setTimeout(() => onChangedRef.current(), 1400);
      } else if (res.status === 409) {
        setDialogOpen(false);
        setError(
          'Nie można już odwołać tej wizyty — jej stan zmienił się w międzyczasie. Odśwież listę.',
        );
      } else if (res.status === 404) {
        setDialogOpen(false);
        setError('Nie znaleziono rezerwacji (dane demo mogły się zresetować).');
      } else {
        setDialogOpen(false);
        setError('Nie udało się odwołać wizyty. Spróbuj ponownie.');
      }
    } catch {
      setDialogOpen(false);
      setError('Błąd połączenia z zamockowanym backendem.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar
              src={booking.specialistPhotoUrl}
              alt={booking.specialistName}
              size={48}
            />
            <div className="flex flex-col gap-0.5">
              {booking.specialistSlug ? (
                <Link
                  href={`/profil/${booking.specialistSlug}`}
                  className="rounded text-base font-semibold text-ink transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  {booking.specialistName}
                </Link>
              ) : (
                <span className="text-base font-semibold text-ink">
                  {booking.specialistName}
                </span>
              )}
              <span className="text-sm text-ink-muted">{booking.serviceName}</span>
              <span className="text-sm text-ink-muted">
                {formatDateTime(booking.startsAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <BookingStateBadge state={booking.state} />
            <span className="text-sm font-semibold text-ink">
              {priceFmt.format(booking.pricePln)}
            </span>
          </div>
        </div>

        {booking.notes && (
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Uwagi: </span>
            {booking.notes}
          </p>
        )}

        {done ? (
          <div
            role="status"
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800"
          >
            Wizyta odwołana (
            <span className="font-mono font-semibold">{done}</span>). Odświeżanie
            listy…
          </div>
        ) : (
          <>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700"
              >
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {booking.canCancel && (
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  Odwołaj wizytę
                </Button>
              )}
              {booking.canReview && (
                <Link
                  href={`/opinia/${encodeURIComponent(booking.id)}`}
                  className={linkPrimary}
                >
                  Wystaw opinię
                </Link>
              )}
              {booking.state === BookingState.NoShow && (
                <Link
                  href={`/spor/${encodeURIComponent(booking.id)}`}
                  className={linkOutline}
                >
                  To pomyłka — byłem/am na wizycie
                </Link>
              )}
              {booking.hasReview && (
                <Chip variant="brand">Opinia wystawiona — oczekuje na moderację</Chip>
              )}
            </div>
          </>
        )}
      </CardContent>

      {dialogOpen && (
        <CancelDialog
          loading={busy}
          onConfirm={() => void runCancel()}
          onClose={() => {
            if (!busy) setDialogOpen(false);
          }}
          description={
            <>
              <p>
                Odwołujesz wizytę: {booking.serviceName} u {booking.specialistName},{' '}
                {formatDateTime(booking.startsAt)}. Termin wróci do puli wolnych.
              </p>
              {isLate && (
                <p className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-warning-700">
                  Do wizyty pozostało mniej niż 24 h. To „późne odwołanie&rdquo;
                  — może wpłynąć na Twój scoring (silnik G7).
                </p>
              )}
            </>
          }
        />
      )}
    </Card>
  );
}
