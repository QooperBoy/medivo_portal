'use client';

/**
 * BookingCard — pojedyncza rezerwacja w panelu specjalisty (E4). Prezentuje
 * usługę, termin (Europe/Warsaw), MINIMALNE dane pacjenta (RODO), stan
 * (BookingStateBadge), cenę oraz wskaźnik nieobecności (scoring G7). Akcje
 * zależą od `scope` i wołają `POST /api/bookings/:id/transition`. Akcje
 * destrukcyjne (odrzuć / odwołaj / nieobecność) przechodzą przez
 * ConfirmActionDialog (wymóg E7). Po sukcesie pokazuje przechwycony nagłówek
 * `x-state-transition` i odświeża listę (`onChanged`).
 */

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { BookingState } from '@/domain';
import type { Booking, BookingListItem, BookingScope } from '@/domain';
import { Button, Card, CardContent, Chip, type ButtonVariant } from '@/components/ui';
import { BookingStateBadge } from '@/components/patient/BookingStateBadge';
import { ConfirmActionDialog } from './ConfirmActionDialog';

export interface BookingCardProps {
  booking: BookingListItem;
  scope: BookingScope;
  /** Wywoływane po udanym przejściu stanu (board robi refetch). */
  onChanged: () => void;
}

const TZ = 'Europe/Warsaw';

const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
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

interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'default' | 'danger';
}

interface CardAction {
  key: string;
  label: string;
  /** Docelowy stan kanoniczny przejścia. */
  to: BookingState;
  variant: ButtonVariant;
  /** Gdy podane — akcja wymaga potwierdzenia w oknie dialogowym (E7). */
  confirm?: ConfirmConfig;
}

/** Zestaw akcji dostępnych dla danego zakresu listy (E4 / E5 / E7 / E8). */
function actionsForScope(scope: BookingScope): readonly CardAction[] {
  switch (scope) {
    case 'pending':
      return [
        {
          key: 'accept',
          label: 'Akceptuj',
          to: BookingState.Confirmed,
          variant: 'primary',
        },
        {
          key: 'reject',
          label: 'Odrzuć',
          to: BookingState.CancelledBySpecialist,
          variant: 'ghost',
          confirm: {
            title: 'Odrzucić rezerwację?',
            description:
              'Pacjent otrzyma informację o odrzuceniu, a termin wróci do puli wolnych. Tej operacji nie można cofnąć.',
            confirmLabel: 'Odrzuć rezerwację',
            tone: 'danger',
          },
        },
      ];
    case 'upcoming':
      return [
        {
          key: 'cancel',
          label: 'Odwołaj',
          to: BookingState.CancelledBySpecialist,
          variant: 'ghost',
          confirm: {
            title: 'Odwołać wizytę?',
            description:
              'Wizyta zostanie odwołana, a pacjent otrzyma powiadomienie. Tej operacji nie można cofnąć.',
            confirmLabel: 'Odwołaj wizytę',
            tone: 'danger',
          },
        },
      ];
    case 'past':
      return [
        {
          key: 'complete',
          label: 'Odbyła się',
          to: BookingState.Completed,
          variant: 'primary',
        },
        {
          key: 'noshow',
          label: 'Nie stawił się',
          to: BookingState.NoShow,
          variant: 'outline',
          confirm: {
            title: 'Oznaczyć nieobecność?',
            description:
              'Zgłoszenie nieobecności pacjenta wpływa na jego scoring (silnik G7). Tej operacji nie można cofnąć.',
            confirmLabel: 'Oznacz nieobecność',
            tone: 'danger',
          },
        },
        {
          key: 'cancel',
          label: 'Odwołaj',
          to: BookingState.CancelledBySpecialist,
          variant: 'ghost',
          confirm: {
            title: 'Odwołać wizytę?',
            description:
              'Wizyta zostanie odwołana i trafi do historii. Tej operacji nie można cofnąć.',
            confirmLabel: 'Odwołaj wizytę',
            tone: 'danger',
          },
        },
      ];
    default:
      // history / all — brak akcji panelu
      return [];
  }
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 text-ink-subtle"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="6.5" r="3" />
      <path d="M4 16.5c0-3 2.7-5 6-5s6 2 6 5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 3h3l1.5 4-2 1.2a10 10 0 0 0 4.3 4.3L17 12l1 3v3h-1A13 13 0 0 1 4 6V4z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="M3 6l7 5 7-5" />
    </svg>
  );
}

export function BookingCard({ booking, scope, onChanged }: BookingCardProps) {
  const actions = actionsForScope(scope);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<CardAction | null>(null);
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

  async function runTransition(action: CardAction) {
    setBusyKey(action.key);
    setError(null);
    try {
      const res = await apiClient.post<Booking>(
        `/api/bookings/${booking.id}/transition`,
        { to: action.to },
      );
      if (res.status === 200) {
        setConfirmAction(null);
        setDone(res.stateTransition ?? `${booking.state}→${action.to}`);
        // Krótka pauza, by pokazać przechwycone przejście, potem refetch listy.
        timerRef.current = setTimeout(() => onChangedRef.current(), 1200);
      } else if (res.status === 409) {
        setConfirmAction(null);
        setError(
          'Ta akcja jest już niedostępna — stan rezerwacji zmienił się w międzyczasie. Odśwież listę.',
        );
      } else {
        setConfirmAction(null);
        setError('Nie udało się wykonać akcji. Spróbuj ponownie.');
      }
    } catch {
      setConfirmAction(null);
      setError('Błąd połączenia z zamockowanym backendem.');
    } finally {
      setBusyKey(null);
    }
  }

  function onActionClick(action: CardAction) {
    if (action.confirm) {
      setConfirmAction(action);
    } else {
      void runTransition(action);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {/* Nagłówek: usługa + termin oraz stan + cena */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-ink">
              {booking.serviceName}
            </span>
            <span className="text-sm text-ink-muted">
              {formatDateTime(booking.startsAt)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <BookingStateBadge state={booking.state} />
            <span className="text-sm font-semibold text-ink">
              {priceFmt.format(booking.pricePln)}
            </span>
          </div>
        </div>

        {/* RODO: dane minimalne — tylko imię i nazwisko oraz kontakt niezbędny
            do obsługi wizyty; bez danych wrażliwych/medycznych. */}
        <div className="flex flex-col gap-1.5 rounded-xl2 border border-slate-200/70 bg-surface-muted p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <UserIcon />
            <span>{booking.patientName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
            <a
              href={`tel:${booking.patientPhone}`}
              className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <PhoneIcon />
              <span>{booking.patientPhone}</span>
            </a>
            <a
              href={`mailto:${booking.patientEmail}`}
              className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <MailIcon />
              <span className="break-all">{booking.patientEmail}</span>
            </a>
          </div>

          {booking.patientNoShowCount > 0 && (
            <Chip
              variant="outline"
              title="Wskaźnik nieobecności pochodzi ze scoringu pacjenta (silnik G7)."
              className="mt-1 self-start border-warning-200 bg-warning-50 text-warning-700"
            >
              Nieobecności pacjenta: {booking.patientNoShowCount}
            </Chip>
          )}
        </div>

        {booking.notes && (
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Uwagi pacjenta: </span>
            {booking.notes}
          </p>
        )}

        {/* Wynik akcji / błąd / przyciski */}
        {done ? (
          <div
            role="status"
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800"
          >
            Zapisano zmianę stanu:{' '}
            <span className="font-mono font-semibold">{done}</span>. Odświeżanie
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
            {actions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.key}
                    variant={action.variant}
                    size="md"
                    loading={busyKey === action.key}
                    disabled={busyKey !== null && busyKey !== action.key}
                    onClick={() => onActionClick(action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      {confirmAction?.confirm && (
        <ConfirmActionDialog
          open
          title={confirmAction.confirm.title}
          description={confirmAction.confirm.description}
          confirmLabel={confirmAction.confirm.confirmLabel}
          tone={confirmAction.confirm.tone}
          loading={busyKey === confirmAction.key}
          onConfirm={() => void runTransition(confirmAction)}
          onClose={() => {
            if (busyKey === null) setConfirmAction(null);
          }}
        />
      )}
    </Card>
  );
}
